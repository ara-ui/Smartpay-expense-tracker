const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\\S+@\\S+\\.\\S+$/, "Please enter a valid email address"]
        },

        password: {
            type: String,
            required: true
        },

        totalExpense: {
            type: Number,
            default: 0
        },

        isPremiumUser: {
            type: Boolean,
            default: false
        },

        monthlyIncome: {
            type: Number,
            default: 0
        },

        // Deprecated legacy budget field. New budgets are stored in BudgetRule.
        // Kept temporarily so the compatibility migration can read old data.
        monthlyBudget: {
            type: Number,
            default: 0
        },

        // Virtual balance used only by the clearly labelled Demo Payment Mode.
        // It never represents money held in a bank/payment account.
        // System-generated SmartPay Payment ID for internal wallet transfers.
        paymentId: {
            type: String,
            unique: true,
            sparse: true,
            lowercase: true,
            trim: true,
            index: true
        },

        demoBalanceMinor: {
            type: Number,
            default: 1000000,
            min: 0,
            validate: { validator: Number.isInteger, message: "demoBalanceMinor must be an integer" }
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);