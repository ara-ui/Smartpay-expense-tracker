const mongoose = require("mongoose");

const forgotPasswordRequestSchema = new mongoose.Schema(
    {
        resetToken: {
            type: String,
            required: true,
            unique: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
        expiresAt: {
            type: Date,
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

forgotPasswordRequestSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

module.exports = mongoose.model(
    "ForgotPasswordRequest",
    forgotPasswordRequestSchema
);
