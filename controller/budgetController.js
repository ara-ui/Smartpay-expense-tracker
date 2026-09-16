const bcrypt = require("bcrypt");
const { CATEGORIES } = require("../utils/categories");
const {
    getBudgetStatus,
    getDailyInsights,
    getOrCreateBudgetRule
} = require("../services/budgetService");
const BudgetAuditLog = require("../model/BudgetAuditLog");
const { createBudgetReauthToken } = require("../utils/budgetReauth");

const PERIODS = ["daily", "weekly", "monthly"];

const isPositiveInt = (value) =>
    Number.isSafeInteger(value) && value > 0;

const cleanRuleSnapshot = (rules) => ({
    dailyLimitPaise: rules.dailyLimitPaise ?? null,
    weeklyLimitPaise: rules.weeklyLimitPaise ?? null,
    monthlyLimitPaise: rules.monthlyLimitPaise ?? null,
    categoryLimits: (rules.categoryLimits || []).map((item) => ({
        category: item.category,
        period: item.period,
        limitPaise: item.limitPaise
    }))
});

exports.verifyBudgetPassword = async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: "Password is required"
            });
        }

        const user = await require("../model/User").findById(req.user._id).select("+password");

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                message: "Incorrect password"
            });
        }

        return res.status(200).json({
            success: true,
            budgetReauthToken: createBudgetReauthToken(user._id),
            expiresInMinutes: 15
        });
    } catch (err) {
        console.error("Budget password verification failed:", err);
        return res.status(500).json({
            success: false,
            message: "Unable to verify password"
        });
    }
};

exports.getBudgetRules = async (req, res) => {
    try {
        const budgetRules = await getOrCreateBudgetRule(req.user._id);
        res.status(200).json({ success: true, budgetRules });
    } catch (err) {
        console.error("Get budget rules failed:", err);
        res.status(500).json({
            success: false,
            message: "Unable to load budget settings"
        });
    }
};

exports.updateBudgetRules = async (req, res) => {
    try {
        const fields = {
            dailyLimitPaise: req.body.dailyLimitPaise,
            weeklyLimitPaise: req.body.weeklyLimitPaise,
            monthlyLimitPaise: req.body.monthlyLimitPaise
        };

        for (const [key, value] of Object.entries(fields)) {
            if (value === undefined) continue;
            if (value !== null && !isPositiveInt(value)) {
                return res.status(400).json({
                    success: false,
                    message: `${key} must be a positive integer (paise) or null to clear it`
                });
            }
        }

        const budgetRules = await getOrCreateBudgetRule(req.user._id);
        const before = cleanRuleSnapshot(budgetRules);

        for (const [key, value] of Object.entries(fields)) {
            if (value !== undefined) budgetRules[key] = value;
        }

        await budgetRules.save();

        const after = cleanRuleSnapshot(budgetRules);
        const action =
            after.dailyLimitPaise === null &&
            after.weeklyLimitPaise === null &&
            after.monthlyLimitPaise === null
                ? "CLEAR_OVERALL"
                : "UPDATE_OVERALL";

        await BudgetAuditLog.create({
            userId: req.user._id,
            action,
            details: { before, after }
        });

        res.status(200).json({
            success: true,
            budgetRules
        });
    } catch (err) {
        console.error("Update budget rules failed:", err);
        res.status(500).json({
            success: false,
            message: "Unable to save budget settings"
        });
    }
};

exports.upsertCategoryLimit = async (req, res) => {
    try {
        const { category, limitPaise } = req.body;
        const period = req.body.period || "monthly";

        if (!CATEGORIES.includes(category)) {
            return res.status(400).json({ success: false, message: "Invalid category" });
        }

        if (!PERIODS.includes(period)) {
            return res.status(400).json({ success: false, message: "Invalid period" });
        }

        if (!isPositiveInt(limitPaise)) {
            return res.status(400).json({
                success: false,
                message: "limitPaise must be a positive safe integer (paise)"
            });
        }

        const budgetRules = await getOrCreateBudgetRule(req.user._id);
        const existing = budgetRules.categoryLimits.find(
            (item) => item.category === category && item.period === period
        );
        const previousLimitPaise = existing ? existing.limitPaise : null;

        if (existing) {
            existing.limitPaise = limitPaise;
        } else {
            budgetRules.categoryLimits.push({ category, period, limitPaise });
        }

        await budgetRules.save();

        await BudgetAuditLog.create({
            userId: req.user._id,
            action: "UPSERT_CATEGORY",
            details: {
                category,
                period,
                previousLimitPaise,
                newLimitPaise: limitPaise
            }
        });

        res.status(200).json({ success: true, budgetRules });
    } catch (err) {
        console.error("Update category budget failed:", err);
        res.status(500).json({
            success: false,
            message: "Unable to save category budget"
        });
    }
};

exports.deleteCategoryLimit = async (req, res) => {
    try {
        const { category } = req.params;
        const period = req.query.period || "monthly";

        if (!CATEGORIES.includes(category)) {
            return res.status(400).json({ success: false, message: "Invalid category" });
        }

        if (!PERIODS.includes(period)) {
            return res.status(400).json({ success: false, message: "Invalid period" });
        }

        const budgetRules = await getOrCreateBudgetRule(req.user._id);
        const existing = budgetRules.categoryLimits.find(
            (item) => item.category === category && item.period === period
        );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "No matching category budget found"
            });
        }

        const previousLimitPaise = existing.limitPaise;

        budgetRules.categoryLimits = budgetRules.categoryLimits.filter(
            (item) => !(item.category === category && item.period === period)
        );

        await budgetRules.save();

        await BudgetAuditLog.create({
            userId: req.user._id,
            action: "DELETE_CATEGORY",
            details: {
                category,
                period,
                previousLimitPaise
            }
        });

        res.status(200).json({ success: true, budgetRules });
    } catch (err) {
        console.error("Delete category budget failed:", err);
        res.status(500).json({
            success: false,
            message: "Unable to delete category budget"
        });
    }
};

exports.getBudgetStatus = async (req, res) => {
    try {
        const status = await getBudgetStatus(req.user._id);
        res.status(200).json({ success: true, ...status });
    } catch (err) {
        console.error("Get budget status failed:", err);
        res.status(500).json({
            success: false,
            message: "Unable to load budget status"
        });
    }
};

exports.getInsights = async (req, res) => {
    try {
        const { insights } = await getDailyInsights(req.user._id);
        res.status(200).json({ success: true, insights });
    } catch (err) {
        console.error("Get daily insights failed:", err);
        res.status(500).json({
            success: false,
            message: "Unable to load daily insights"
        });
    }
};
