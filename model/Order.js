const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        orderId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        provider: {
            type: String,
            required: true,
            enum: ["cashfree"],
            default: "cashfree",
            index: true
        },
        purpose: {
            type: String,
            required: true,
            enum: ["PREMIUM_MEMBERSHIP", "EXPENSE_PAYMENT"],
            default: "PREMIUM_MEMBERSHIP",
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
            enum: ["INR"],
            default: "INR"
        },
        paymentSessionId: { type: String, default: null },
        paymentId: { type: String, default: null, index: true },
        remark: { type: String, default: null, trim: true },
        expenseCategory: { type: String, default: null },
        status: {
            type: String,
            enum: ["PENDING", "PROCESSING", "SUCCESSFUL", "FAILED"],
            required: true,
            default: "PENDING",
            index: true
        },
        processingStartedAt: { type: Date, default: null },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        idempotencyKey: {
            type: String,
            default: null,
            trim: true
        },
        idempotencyFingerprint: {
            type: String,
            default: null
        }
    },
    { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ provider: 1, orderId: 1 }, { unique: true });
orderSchema.index(
    { userId: 1, idempotencyKey: 1 },
    {
        unique: true,
        partialFilterExpression: { idempotencyKey: { $type: "string" } }
    }
);

module.exports = mongoose.model("Order", orderSchema);
