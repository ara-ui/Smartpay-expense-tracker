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

module.exports = mongoose.model(
    "ForgotPasswordRequest",
    forgotPasswordRequestSchema
);