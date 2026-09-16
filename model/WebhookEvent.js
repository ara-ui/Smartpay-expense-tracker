const mongoose = require("mongoose");

const webhookEventSchema = new mongoose.Schema(
    {
        provider: {
            type: String,
            required: true,
            enum: ["cashfree"],
            index: true
        },

        eventKey: {
            type: String,
            required: true
        },

        eventType: {
            type: String,
            required: true
        },

        orderId: {
            type: String,
            default: null,
            index: true
        },

        providerTransactionId: {
            type: String,
            default: null,
            index: true
        },

        signatureVerified: {
            type: Boolean,
            required: true,
            default: false
        },

        status: {
            type: String,
            enum: ["RECEIVED", "PROCESSING", "PROCESSED", "FAILED"],
            required: true,
            default: "RECEIVED",
            index: true
        },

        receivedAt: {
            type: Date,
            default: Date.now
        },

        processedAt: {
            type: Date,
            default: null
        },

        processingStartedAt: {
            type: Date,
            default: null
        },

        errorMessage: {
            type: String,
            default: null
        }
    },
    { timestamps: true }
);

webhookEventSchema.index({ provider: 1, eventKey: 1 }, { unique: true });
webhookEventSchema.index({ provider: 1, orderId: 1, createdAt: -1 });

module.exports = mongoose.model("WebhookEvent", webhookEventSchema);
