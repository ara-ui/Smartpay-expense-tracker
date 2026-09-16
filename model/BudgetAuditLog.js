const mongoose = require("mongoose");

const budgetAuditLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        action: {
            type: String,
            enum: ["UPDATE_OVERALL", "CLEAR_OVERALL", "UPSERT_CATEGORY", "DELETE_CATEGORY"],
            required: true
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("BudgetAuditLog", budgetAuditLogSchema);
