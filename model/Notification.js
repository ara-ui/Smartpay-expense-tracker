const mongoose = require("mongoose");

const NOTIFICATION_TYPES = [
    "MONEY_RECEIVED",
    "MONEY_SENT",
    "BUDGET_ALERT",
    "BUDGET_EXCEEDED"
];

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        type: {
            type: String,
            required: true,
            enum: NOTIFICATION_TYPES
        },
        title: { type: String, required: true },
        message: { type: String, required: true },
        amountMinor: { type: Number, default: null },
        relatedTransferId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DemoTransfer",
            default: null
        },
        
        relatedCategory: { type: String, default: null },

        period: { type: String, default: null },
        isRead: { type: Boolean, default: false }
    },
    { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

notificationSchema.index(
    { userId: 1, type: 1, relatedCategory: 1, period: 1 },
    { unique: true, partialFilterExpression: { period: { $type: "string" } } }
);

module.exports = mongoose.model("Notification", notificationSchema);
