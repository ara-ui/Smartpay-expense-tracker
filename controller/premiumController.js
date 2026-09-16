const User = require("../model/User");
const BudgetRule = require("../model/BudgetRule");
const Expense = require("../model/Expense");
const { getPeriodBounds } = require("../services/budgetService");

const SUPPORTED_PERIODS = new Set(["weekly", "monthly"]);

const getSavingsLeaderboard = async (period) => {
    const now = new Date();
    const { start, end } = getPeriodBounds(period, now);
    const limitField = `${period}LimitPaise`;

    // Only users who have explicitly configured a budget for the selected
    // period participate. Savings = configured limit - actual expenses.
    const budgetRules = await BudgetRule.find({
        [limitField]: { $gt: 0 }
    }).select(`userId ${limitField}`).lean();

    if (!budgetRules.length) return [];

    const userIds = budgetRules.map((rule) => rule.userId);

    const expenseRows = await Expense.aggregate([
        {
            $match: {
                userId: { $in: userIds },
                createdAt: { $gte: start, $lt: end }
            }
        },
        {
            $group: {
                _id: "$userId",
                spentPaise: {
                    $sum: {
                        $round: [{ $multiply: ["$amount", 100] }, 0]
                    }
                }
            }
        }
    ]);

    const spentByUser = new Map(
        expenseRows.map((row) => [String(row._id), Number(row.spentPaise || 0)])
    );

    const users = await User.find({
        _id: { $in: userIds }
    }).select("name").lean();

    const userById = new Map(users.map((user) => [String(user._id), user]));

    return budgetRules
        .map((rule) => {
            const user = userById.get(String(rule.userId));
            if (!user) return null;

            const limitPaise = Number(rule[limitField] || 0);
            const spentPaise = spentByUser.get(String(rule.userId)) || 0;
            const savingsPaise = Math.max(0, limitPaise - spentPaise);

            return {
                userId: rule.userId,
                name: user.name,
                period,
                limitPaise,
                spentPaise,
                savingsPaise
            };
        })
        .filter(Boolean)
        .sort((a, b) =>
            b.savingsPaise - a.savingsPaise ||
            a.spentPaise - b.spentPaise ||
            a.name.localeCompare(b.name)
        );
};

const getLeaderBoard = async (req, res) => {
    try {
        const period = String(req.query.period || "weekly").toLowerCase();

        if (!SUPPORTED_PERIODS.has(period)) {
            return res.status(400).json({
                success: false,
                message: "Leaderboard period must be weekly or monthly"
            });
        }

        const leaderboard = await getSavingsLeaderboard(period);

        return res.status(200).json({
            success: true,
            period,
            metric: "savings",
            definition: "Savings = budget limit minus expenses for the selected period",
            leaderboard
        });
    } catch (err) {
        console.error("Savings leaderboard failed:", err);
        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

module.exports = {
    getLeaderBoard
};
