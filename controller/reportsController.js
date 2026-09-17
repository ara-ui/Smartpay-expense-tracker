const { Expense, ReportDownload } = require("../model");

const getReport = async (req, res) => {
    try {
        const {
            type,
            date,
            startDate: customStartDate,
            endDate: customEndDate
        } = req.query;

        let startDate;
        let endDate;

        if (customStartDate && customEndDate) {


            startDate = new Date(customStartDate);
            endDate = new Date(customEndDate);

            endDate.setDate(endDate.getDate() + 1);

        } else {

            switch (type) {

                case "daily":
                    startDate = new Date(date);
                    endDate = new Date(date);

                    endDate.setDate(endDate.getDate() + 1);
                    break;

                case "weekly":
                    startDate = new Date(date);
                    endDate = new Date(date);

                    endDate.setDate(endDate.getDate() + 7);
                    break;

                case "monthly":
                    startDate = new Date(date);
                    endDate = new Date(startDate);

                    endDate.setMonth(endDate.getMonth() + 1);
                    break;

                case "yearly":
                    startDate = new Date(date);
                    endDate = new Date(startDate);

                    endDate.setFullYear(
                        endDate.getFullYear() + 1
                    );
                    break;

                default:
                    return res.status(400).json({
                        success: false,
                        message: "Invalid report type"
                    });
            }
        }

        // Mongoose query
        const expenses = await Expense.find({
            userId: req.user._id,
            createdAt: {
                $gte: startDate,
                $lt: endDate
            }
        }).sort({
            createdAt: -1
        });

        const totalExpense = expenses.reduce((sum, expense) => {
            return sum + Number(expense.amount);
        }, 0);

        res.status(200).json({
            success: true,
            expenses,
            totalExpense
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });

    }
};

const ALLOWED_REPORT_TYPES = ["daily", "weekly", "monthly", "yearly", "custom"];
const ALLOWED_FORMATS = ["pdf", "csv"];
const FILENAME_SAFE = /^[A-Za-z0-9 ._()-]{1,150}$/;

// Records a report the user just actually downloaded (client-generated
// PDF/CSV), so it can show up in Account > Report Download History and be
// regenerated later via "Download Again". Never called just for opening
// the Reports page - only after a real, successful download.
const recordReportDownload = async (req, res) => {
    try {
        const { reportType, periodLabel, filename, format, params } = req.body;

        if (!ALLOWED_REPORT_TYPES.includes(reportType)) {
            return res.status(400).json({ success: false, message: "Invalid report type" });
        }
        if (!ALLOWED_FORMATS.includes(format)) {
            return res.status(400).json({ success: false, message: "Invalid report format" });
        }
        if (typeof filename !== "string" || !FILENAME_SAFE.test(filename)) {
            return res.status(400).json({ success: false, message: "Invalid filename" });
        }
        if (typeof periodLabel !== "string" || !periodLabel.trim() || periodLabel.length > 120) {
            return res.status(400).json({ success: false, message: "Invalid period label" });
        }

        const record = await ReportDownload.create({
            userId: req.user._id,
            reportType,
            periodLabel: periodLabel.trim(),
            filename,
            format,
            params: {
                date: params?.date || null,
                startDate: params?.startDate || null,
                endDate: params?.endDate || null
            }
        });

        res.status(201).json({ success: true, record });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Unable to save report download history"
        });
    }
};

const getReportDownloadHistory = async (req, res) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
        const page = Math.max(Number(req.query.page) || 1, 1);

        const [history, total] = await Promise.all([
            ReportDownload.find({ userId: req.user._id })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ReportDownload.countDocuments({ userId: req.user._id })
        ]);

        res.status(200).json({
            success: true,
            history,
            page,
            totalPages: Math.max(Math.ceil(total / limit), 1)
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Unable to load report download history"
        });
    }
};

module.exports = {
    getReport,
    recordReportDownload,
    getReportDownloadHistory
};