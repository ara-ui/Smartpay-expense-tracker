const Expense = require("../model/Expense");
const BudgetRule = require("../model/BudgetRule");
const BudgetUsage = require("../model/BudgetUsage");
const User = require("../model/User");

const PERIODS = ["daily", "weekly", "monthly"];
const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

class BudgetExceededError extends Error {
    constructor(details) {
        super("Budget limit exceeded");
        this.name = "BudgetExceededError";
        this.code = "BUDGET_EXCEEDED";
        this.details = details;
    }
}

const pad = (n) => String(n).padStart(2, "0");

function getLocalParts(date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: APP_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

function getPeriodInfo(date = new Date()) {
    const local = getLocalParts(date);
    const localDate = new Date(Date.UTC(local.year, local.month - 1, local.day));
    const dayOfWeek = localDate.getUTCDay(); // Sunday=0
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(localDate);
    monday.setUTCDate(monday.getUTCDate() + mondayOffset);
    const thursday = new Date(monday);
    thursday.setUTCDate(thursday.getUTCDate() + 3);
    const isoYear = thursday.getUTCFullYear();
    const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
    const firstThursdayDay = firstThursday.getUTCDay() || 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() + (4 - firstThursdayDay));
    const week = 1 + Math.round((thursday - firstThursday) / 604800000);

    return {
        daily: { key: `${local.year}-${pad(local.month)}-${pad(local.day)}` },
        weekly: { key: `${isoYear}-W${pad(week)}` },
        monthly: { key: `${local.year}-${pad(local.month)}` }
    };
}

function getPeriodBounds(periodType, date = new Date()) {
    const local = getLocalParts(date);
    const localDate = new Date(Date.UTC(local.year, local.month - 1, local.day));
    let startLocal;

    if (periodType === "daily") {
        startLocal = localDate;
    } else if (periodType === "weekly") {
        const day = localDate.getUTCDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        startLocal = new Date(localDate);
        startLocal.setUTCDate(startLocal.getUTCDate() + mondayOffset);
    } else {
        startLocal = new Date(Date.UTC(local.year, local.month - 1, 1));
    }

    const endLocal = new Date(startLocal);
    if (periodType === "daily") endLocal.setUTCDate(endLocal.getUTCDate() + 1);
    if (periodType === "weekly") endLocal.setUTCDate(endLocal.getUTCDate() + 7);
    if (periodType === "monthly") endLocal.setUTCMonth(endLocal.getUTCMonth() + 1);

    const toUtc = (localUtcDate) => {
        const probe = new Date(localUtcDate);
        const offsetParts = new Intl.DateTimeFormat("en-US", {
            timeZone: APP_TIMEZONE,
            timeZoneName: "longOffset",
            hour: "2-digit"
        }).formatToParts(probe);
        const offset = offsetParts.find((p) => p.type === "timeZoneName")?.value || "GMT+00:00";
        const match = offset.match(/GMT([+-])(\d{2}):?(\d{2})?/);
        if (!match) return probe;
        const hours = Number(match[2]);
        const minutes = Number(match[3] || 0);
        const offsetMs = (hours * 60 + minutes) * 60000 * (match[1] === "+" ? 1 : -1);
        return new Date(probe.getTime() - offsetMs);
    };

    return { start: toUtc(startLocal), end: toUtc(endLocal) };
}

function amountToPaise(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || !Number.isSafeInteger(Math.round(value * 100))) {
        throw new Error("Amount must be a positive valid number");
    }
    if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-8) {
        throw new Error("Amount can have at most two decimal places");
    }
    return Math.round(value * 100);
}


async function getOrCreateBudgetRule(userId, session) {
    let query = BudgetRule.findOne({ userId });
    if (session) query = query.session(session);
    let budgetRules = await query;

    // One-time compatibility migration for the old User.monthlyBudget field.
    // The new BudgetRule document is the single source of truth. We also
    // handle an empty BudgetRule that may have been created by Phase 2/3
    // before the legacy value was migrated.
    let userQuery = User.findById(userId).select("monthlyBudget");
    if (session) userQuery = userQuery.session(session);
    const user = await userQuery;

    const legacyMonthlyBudget = Number(user?.monthlyBudget);
    const hasLegacyBudget =
        Number.isFinite(legacyMonthlyBudget) && legacyMonthlyBudget > 0;
    const monthlyLimitPaise = hasLegacyBudget
        ? Math.round(legacyMonthlyBudget * 100)
        : null;

    const ruleIsEmpty =
        budgetRules &&
        budgetRules.dailyLimitPaise == null &&
        budgetRules.weeklyLimitPaise == null &&
        budgetRules.monthlyLimitPaise == null &&
        (budgetRules.categoryLimits?.length || 0) === 0;

    if (budgetRules) {
        if (ruleIsEmpty && hasLegacyBudget) {
            budgetRules.monthlyLimitPaise = monthlyLimitPaise;
            await budgetRules.save({ session });
            if (user) {
                user.monthlyBudget = 0;
                await user.save({ session });
            }
        }
        return budgetRules;
    }

    try {
        const created = await BudgetRule.create(
            [{
                userId,
                monthlyLimitPaise
            }],
            { session }
        );

        if (hasLegacyBudget && user) {
            user.monthlyBudget = 0;
            await user.save({ session });
        }

        return created[0];
    } catch (err) {
        if (err.code === 11000) {
            let retryQuery = BudgetRule.findOne({ userId });
            if (session) retryQuery = retryQuery.session(session);
            return retryQuery;
        }
        throw err;
    }
}

async function historicalUsage(userId, periodType, category, date, session) {
    const { start, end } = getPeriodBounds(periodType, date);
    const match = { userId, createdAt: { $gte: start, $lt: end } };
    if (category) match.category = category;

    let aggregateQuery = Expense.aggregate([
        { $match: match },
        { $group: { _id: null, totalPaise: { $sum: { $round: [{ $multiply: ["$amount", 100] }, 0] } } } }
    ]);
    if (session) aggregateQuery = aggregateQuery.session(session);
    const result = await aggregateQuery;

    return result[0]?.totalPaise || 0;
}

async function getOrInitializeUsage(userId, periodType, periodKey, category, date, session) {
    let usageQuery = BudgetUsage.findOne({ userId, periodType, periodKey, category });
    if (session) usageQuery = usageQuery.session(session);
    let usage = await usageQuery;
    if (usage) return usage;

    const spentPaise = await historicalUsage(userId, periodType, category, date, session);
    try {
        usage = await BudgetUsage.create(
            [{ userId, periodType, periodKey, category, spentPaise }],
            { session }
        );
        return usage[0];
    } catch (err) {
        if (err.code === 11000) {
            let retryQuery = BudgetUsage.findOne({ userId, periodType, periodKey, category });
            if (session) retryQuery = retryQuery.session(session);
            return retryQuery;
        }
        throw err;
    }
}

function applicableRules(budgetRules, category) {
    const rules = [];
    for (const period of PERIODS) {
        const limit = budgetRules[`${period}LimitPaise`];
        if (limit !== null && limit !== undefined) {
            rules.push({ periodType: period, category: null, limitPaise: limit });
        }
        const categoryRule = budgetRules.categoryLimits.find(
            (item) => item.category === category && item.period === period
        );
        if (categoryRule) {
            rules.push({ periodType: period, category, limitPaise: categoryRule.limitPaise });
        }
    }
    return rules;
}

async function checkExpenseBudget({ userId, amount, category, date = new Date() }) {
    const amountPaise = amountToPaise(amount);
    const budgetRules = await getOrCreateBudgetRule(userId, null);
    if (!budgetRules) return { amountPaise, checks: [] };

    const rules = applicableRules(budgetRules, category);
    const checks = [];

    for (const rule of rules) {
        const periodKey = getPeriodInfo(date)[rule.periodType].key;
        const usage = await getOrInitializeUsage(
            userId,
            rule.periodType,
            periodKey,
            rule.category,
            date,
            null
        );

        const projected = usage.spentPaise + amountPaise;
        if (amountPaise > rule.limitPaise || projected > rule.limitPaise) {
            throw new BudgetExceededError({
                period: rule.periodType,
                category: rule.category,
                limitPaise: rule.limitPaise,
                spentPaise: usage.spentPaise,
                requestedPaise: amountPaise,
                remainingPaise: Math.max(0, rule.limitPaise - usage.spentPaise)
            });
        }

        checks.push({
            period: rule.periodType,
            category: rule.category,
            limitPaise: rule.limitPaise,
            spentPaise: usage.spentPaise,
            remainingPaise: rule.limitPaise - usage.spentPaise
        });
    }

    return { amountPaise, checks };
}

async function enforceExpenseBudget({ userId, amount, category, session, date = new Date() }) {
    const amountPaise = amountToPaise(amount);
    const budgetRules = await getOrCreateBudgetRule(userId, session);

    if (!budgetRules) return { amountPaise, checks: [] };

    const rules = applicableRules(budgetRules, category);
    const checks = [];

    for (const rule of rules) {
        if (amountPaise > rule.limitPaise) {
            throw new BudgetExceededError({
                period: rule.periodType,
                category: rule.category,
                limitPaise: rule.limitPaise,
                spentPaise: 0,
                requestedPaise: amountPaise,
                remainingPaise: rule.limitPaise
            });
        }

        const periodKey = getPeriodInfo(date)[rule.periodType].key;
        const usage = await getOrInitializeUsage(
            userId,
            rule.periodType,
            periodKey,
            rule.category,
            date,
            session
        );

        const projected = usage.spentPaise + amountPaise;
        if (projected > rule.limitPaise) {
            throw new BudgetExceededError({
                period: rule.periodType,
                category: rule.category,
                limitPaise: rule.limitPaise,
                spentPaise: usage.spentPaise,
                requestedPaise: amountPaise,
                remainingPaise: Math.max(0, rule.limitPaise - usage.spentPaise)
            });
        }

        usage.spentPaise = projected;
        await usage.save({ session });
        checks.push({
            period: rule.periodType,
            category: rule.category,
            limitPaise: rule.limitPaise,
            spentPaise: projected,
            remainingPaise: rule.limitPaise - projected
        });
    }

    return { amountPaise, checks };
}

async function reverseExpenseBudget({ userId, amount, category, createdAt, session }) {
    const amountPaise = amountToPaise(amount);
    const date = createdAt || new Date();
    const budgetRules = await BudgetRule.findOne({ userId }).session(session);
    if (!budgetRules) return;

    for (const rule of applicableRules(budgetRules, category)) {
        const periodKey = getPeriodInfo(date)[rule.periodType].key;
        const usage = await BudgetUsage.findOne({
            userId,
            periodType: rule.periodType,
            periodKey,
            category: rule.category
        }).session(session);
        if (!usage) continue;
        usage.spentPaise = Math.max(0, usage.spentPaise - amountPaise);
        await usage.save({ session });
    }
}

async function getBudgetStatus(userId, date = new Date()) {
    const budgetRules = await getOrCreateBudgetRule(userId, null);
    const result = { daily: [], weekly: [], monthly: [] };
    if (!budgetRules) return { budgetRules: null, usage: result };

    for (const rule of applicableRules(budgetRules, null).filter((r) => r.category === null)) {
        const periodKey = getPeriodInfo(date)[rule.periodType].key;
        const usage = await getOrInitializeUsage(userId, rule.periodType, periodKey, null, date, null);
        result[rule.periodType].push({ category: null, limitPaise: rule.limitPaise, spentPaise: usage.spentPaise, remainingPaise: Math.max(0, rule.limitPaise - usage.spentPaise) });
    }

    for (const categoryRule of budgetRules.categoryLimits) {
        const periodKey = getPeriodInfo(date)[categoryRule.period].key;
        const usage = await getOrInitializeUsage(userId, categoryRule.period, periodKey, categoryRule.category, date, null);
        result[categoryRule.period].push({ category: categoryRule.category, limitPaise: categoryRule.limitPaise, spentPaise: usage.spentPaise, remainingPaise: Math.max(0, categoryRule.limitPaise - usage.spentPaise) });
    }

    return { budgetRules, usage: result };
}

const formatRupees = (paise) =>
    (Number(paise || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });

async function categoryTotalsForWeek(userId, start, end) {
    const rows = await Expense.aggregate([
        { $match: { userId, createdAt: { $gte: start, $lt: end } } },
        { $group: { _id: "$category", totalPaise: { $sum: { $round: [{ $multiply: ["$amount", 100] }, 0] } } } }
    ]);
    const byCategory = new Map(rows.map((row) => [row._id, Number(row.totalPaise || 0)]));
    const total = rows.reduce((sum, row) => sum + Number(row.totalPaise || 0), 0);
    return { total, byCategory };
}

// Builds a small set of plain-language "Daily Insight" messages from real
// expense/budget data only. Nothing here is invented: every number traces
// back to an aggregation over the user's own Expense/BudgetRule documents.
async function getDailyInsights(userId, date = new Date()) {
    const budgetRules = await getOrCreateBudgetRule(userId, null);
    const thisWeek = getPeriodBounds("weekly", date);
    const lastWeek = getPeriodBounds("weekly", new Date(thisWeek.start.getTime() - 1));

    const [thisWeekData, lastWeekData] = await Promise.all([
        categoryTotalsForWeek(userId, thisWeek.start, thisWeek.end),
        categoryTotalsForWeek(userId, lastWeek.start, lastWeek.end)
    ]);

    const weeklyLimitPaise = budgetRules?.weeklyLimitPaise ?? null;
    const insights = [];

    if (weeklyLimitPaise) {
        if (thisWeekData.total <= weeklyLimitPaise) {
            insights.push({
                type: "BUDGET_STATUS",
                tone: "positive",
                message: `You're within your weekly budget, with ₹${formatRupees(weeklyLimitPaise - thisWeekData.total)} left to spend.`
            });
        } else {
            insights.push({
                type: "BUDGET_STATUS",
                tone: "warning",
                message: `You're ₹${formatRupees(thisWeekData.total - weeklyLimitPaise)} over your weekly budget this week.`
            });
        }

        if (lastWeekData.total > 0) {
            const savingsThisWeek = weeklyLimitPaise - thisWeekData.total;
            const savingsLastWeek = weeklyLimitPaise - lastWeekData.total;
            const diff = savingsThisWeek - savingsLastWeek;

            if (savingsThisWeek > 0 && diff > 0) {
                insights.push({
                    type: "SAVINGS_TREND",
                    tone: "positive",
                    message: `You saved ₹${formatRupees(savingsThisWeek)} this week, ₹${formatRupees(diff)} more than last week.`
                });
            } else if (diff < 0) {
                insights.push({
                    type: "SAVINGS_TREND",
                    tone: "neutral",
                    message: `You spent ₹${formatRupees(Math.abs(diff))} more than last week. A small tweak now can get you back on track.`
                });
            }
        }
    }

    let biggestCategory = null;
    let biggestDelta = 0;
    const allCategories = new Set([...thisWeekData.byCategory.keys(), ...lastWeekData.byCategory.keys()]);
    for (const category of allCategories) {
        const current = thisWeekData.byCategory.get(category) || 0;
        const previous = lastWeekData.byCategory.get(category) || 0;
        const delta = current - previous;
        if (previous > 0 && Math.abs(delta) > Math.abs(biggestDelta)) {
            biggestDelta = delta;
            biggestCategory = { category, current, previous };
        }
    }
    if (biggestCategory && biggestDelta !== 0) {
        const pct = Math.round((Math.abs(biggestDelta) / biggestCategory.previous) * 100);
        const direction = biggestDelta < 0 ? "decreased" : "increased";
        insights.push({
            type: "CATEGORY_TREND",
            tone: direction === "decreased" ? "positive" : "neutral",
            message: `Your ${biggestCategory.category} spending ${direction} by ${pct}% this week.`
        });
    }

    if (!insights.length) {
        insights.push({
            type: "ONBOARDING",
            tone: "neutral",
            message: "Add a few expenses and set a weekly budget to start seeing personalized insights here."
        });
    }

    return { insights: insights.slice(0, 3) };
}

module.exports = {
    BudgetExceededError,
    amountToPaise,
    enforceExpenseBudget,
    checkExpenseBudget,
    reverseExpenseBudget,
    getBudgetStatus,
    getDailyInsights,
    getOrCreateBudgetRule,
    getPeriodInfo,
    getPeriodBounds
};
