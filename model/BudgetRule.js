const mongoose = require("mongoose");
const { CATEGORIES } = require("../utils/categories");

const PERIODS = ["daily", "weekly", "monthly"];

// All limits are stored as integer paise to avoid floating-point money errors.
const categoryLimitSchema = new mongoose.Schema(
    {
        category: {
            type: String,
            required: true,
            enum: CATEGORIES
        },
        period: {
            type: String,
            required: true,
            enum: PERIODS,
            default: "monthly"
        },
        limitPaise: {
            type: Number,
            required: true,
            validate: {
                validator: (v) => Number.isInteger(v) && v > 0,
                message: "limitPaise must be a positive integer (paise, not rupees)"
            }
        }
    },
    { _id: false }
);

// One document per user. Top-level limits are overall spending caps;
// categoryLimits holds any number of per-category (and per-period) caps
// without needing a separate collection.
const budgetRuleSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        dailyLimitPaise: {
            type: Number,
            default: null,
            validate: {
                validator: (v) => v === null || (Number.isInteger(v) && v > 0),
                message: "dailyLimitPaise must be a positive integer (paise) or null"
            }
        },

        weeklyLimitPaise: {
            type: Number,
            default: null,
            validate: {
                validator: (v) => v === null || (Number.isInteger(v) && v > 0),
                message: "weeklyLimitPaise must be a positive integer (paise) or null"
            }
        },

        monthlyLimitPaise: {
            type: Number,
            default: null,
            validate: {
                validator: (v) => v === null || (Number.isInteger(v) && v > 0),
                message: "monthlyLimitPaise must be a positive integer (paise) or null"
            }
        },

        categoryLimits: {
            type: [categoryLimitSchema],
            default: []
        }
    },
    { timestamps: true }
);

budgetRuleSchema.path("categoryLimits").validate(function (limits) {
    const seen = new Set();
    for (const limit of limits || []) {
        const key = `${limit.category}:${limit.period}`;
        if (seen.has(key)) return false;
        seen.add(key);
    }
    return true;
}, "Duplicate category + period budget rule");

module.exports = mongoose.model("BudgetRule", budgetRuleSchema);
