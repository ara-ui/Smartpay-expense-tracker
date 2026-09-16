const mongoose = require("mongoose");

const demoTransferSchema = new mongoose.Schema(
    {
        transferId: { type: String, required: true, unique: true, index: true },
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        recipientEmail: { type: String, required: true, lowercase: true, trim: true },
        recipientName: { type: String, required: true, trim: true },
        amountMinor: {
            type: Number,
            required: true,
            min: 1,
            validate: { validator: Number.isInteger, message: "amountMinor must be an integer" }
        },
        currency: { type: String, required: true, enum: ["INR"], default: "INR" },
        remark: { type: String, required: true, trim: true, maxlength: 200 },
        status: { type: String, required: true, enum: ["SUCCESSFUL", "FAILED"], default: "SUCCESSFUL", index: true },
        idempotencyKey: { type: String, required: true, trim: true },
        senderBalanceAfterMinor: { type: Number, required: true },
        receiverBalanceAfterMinor: { type: Number, required: true }
    },
    { timestamps: true }
);

demoTransferSchema.index({ senderId: 1, idempotencyKey: 1 }, { unique: true });
demoTransferSchema.index({ senderId: 1, createdAt: -1 });
demoTransferSchema.index({ receiverId: 1, createdAt: -1 });

module.exports = mongoose.model("DemoTransfer", demoTransferSchema);
