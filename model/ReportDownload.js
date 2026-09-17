const mongoose = require("mongoose");

const reportDownloadSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        // "daily" | "weekly" | "monthly" | "yearly" | "custom"
        reportType: { type: String, required: true },
        // Human-readable period, e.g. "September 2026" or "07/09/2026 - 13/09/2026"
        periodLabel: { type: String, required: true },
        filename: { type: String, required: true },
        // "pdf" | "csv"
        format: { type: String, required: true },
      
        params: {
            date: { type: String, default: null },
            startDate: { type: String, default: null },
            endDate: { type: String, default: null }
        }
    },
    { timestamps: true }
);

reportDownloadSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("ReportDownload", reportDownloadSchema);
