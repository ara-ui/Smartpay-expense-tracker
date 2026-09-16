const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        orderId: {
            type: String,
            required: true,
            index: true
        },

        provider: {
            type: String,
            required: true,
            enum: ["cashfree", "demo"],
            index: true
        },

        purpose: {
            type: String,
            required: true,
            enum: ["PREMIUM_MEMBERSHIP", "EXPENSE_PAYMENT", "INTERNAL_TRANSFER_SENT"],
            index: true
        },

        amountMinor: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: "amountMinor must be an integer"
            }
        },

        currency: {
            type: String,
            required: true,
            enum: ["INR"]
        },

        providerTransactionId: {
            type: String,
            default: null,
            index: true
        },

        remark: {
            type: String,
            default: null,
            trim: true
        },

        recipientType: { type: String, default: null },

        recipientName: { type: String, default: null, trim: true },

        recipientValueMasked: { type: String, default: null, trim: true },

        expenseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Expense",
            default: null,
            index: true
        },

        status: {
            type: String,
            required: true,
            enum: ["PENDING", "SUCCESSFUL", "FAILED"],
            default: "PENDING",
            index: true
        },

        paymentMethod: {
            type: String,
            default: null
        },

        transactionDate: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// One internal transaction record represents one provider transaction.
transactionSchema.index({ provider: 1, orderId: 1 }, { unique: true });
transactionSchema.index({ provider: 1, providerTransactionId: 1 }, {
    unique: true,
    partialFilterExpression: { providerTransactionId: { $type: "string" } }
});
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, status: 1, transactionDate: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
