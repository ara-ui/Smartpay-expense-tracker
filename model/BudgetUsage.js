const mongoose = require("mongoose");

const PERIODS = ["daily", "weekly", "monthly"];

const budgetUsageSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        periodType: {
            type: String,
            required: true,
            enum: PERIODS
        },
        periodKey: {
            type: String,
            required: true
        },
        category: {
            type: String,
            default: null
        },
        spentPaise: {
            type: Number,
            required: true,
            min: 0,
            validate: {
                validator: (v) => Number.isSafeInteger(v) && v >= 0,
                message: "spentPaise must be a non-negative safe integer"
            }
        }
    },
    { timestamps: true }
);

budgetUsageSchema.index(
    { userId: 1, periodType: 1, periodKey: 1, category: 1 },
    { unique: true }
);

module.exports = mongoose.model("BudgetUsage", budgetUsageSchema);
