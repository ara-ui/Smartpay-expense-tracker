const { Expense, ReportDownload, BudgetRule } = require("../model");
const { getPeriodBounds } = require("../services/budgetService");

const OVERALL_LIMIT_FIELD = {
    daily: "dailyLimitPaise",
    weekly: "weeklyLimitPaise",
    monthly: "monthlyLimitPaise"
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseDateOnly = (value) => {
    if (typeof value !== "string" || !DATE_ONLY_PATTERN.test(value)) {
        return null;
    }

    const [year, month, day] = value.split("-").map(Number);
    const probe = new Date(Date.UTC(year, month - 1, day, 12));

    if (
        probe.getUTCFullYear() !== year ||
        probe.getUTCMonth() !== month - 1 ||
        probe.getUTCDate() !== day
    ) {
        return null;
    }

    return probe;
};

const addUtcDays = (date, days) =>
    new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const getReportBounds = ({ type, date, customStartDate, customEndDate }) => {
    if (customStartDate || customEndDate) {
        if (!customStartDate || !customEndDate) {
            return { error: "Both startDate and endDate are required for a custom report" };
        }

        const start = parseDateOnly(customStartDate);
        const end = parseDateOnly(customEndDate);

        if (!start || !end) {
            return { error: "Invalid custom report dates" };
        }

        const startBounds = getPeriodBounds("daily", start);
        const endBounds = getPeriodBounds("daily", addUtcDays(end, 1));

        if (startBounds.start >= endBounds.start) {
            return { error: "End date must be on or after start date" };
        }

        return {
            start: startBounds.start,
            end: endBounds.start,
            reportType: "custom"
        };
    }

    if (!["daily", "weekly", "monthly", "yearly"].includes(type)) {
        return { error: "Invalid report type" };
    }

    const selectedDate = parseDateOnly(date);
    if (!selectedDate) {
        return { error: "A valid date in YYYY-MM-DD format is required" };
    }

    if (type === "yearly") {
        const year = selectedDate.getUTCFullYear();
        const start = getPeriodBounds("monthly", selectedDate).start;
        const nextYear = parseDateOnly(`${year + 1}-01-01`);
        const end = getPeriodBounds("monthly", nextYear).start;
        return { start, end, reportType: type };
    }

    const bounds = getPeriodBounds(type, selectedDate);
    return {
        start: bounds.start,
        end: bounds.end,
        reportType: type
    };
};

const getReport = async (req, res) => {
    try {
        const {
            type,
            date,
            startDate: customStartDate,
            endDate: customEndDate
        } = req.query;

        const bounds = getReportBounds({
            type,
            date,
            customStartDate,
            customEndDate
        });

        if (bounds.error) {
            return res.status(400).json({
                success: false,
                message: bounds.error
            });
        }

        const expenses = await Expense.find({
            userId: req.user._id,
            createdAt: {
                $gte: bounds.start,
                $lt: bounds.end
            }
        })
            .sort({ createdAt: -1 })
            .lean();

        // Sum integer paise rather than floating-point rupees.
        const totalPaise = expenses.reduce(
            (sum, expense) => sum + Math.round(Number(expense.amount) * 100),
            0
        );
        const totalExpense = totalPaise / 100;

        let savings = null;
        const limitField = OVERALL_LIMIT_FIELD[bounds.reportType];

        if (limitField) {
            const budgetRule = await BudgetRule.findOne({
                userId: req.user._id
            }).lean();

            const limitPaise = budgetRule?.[limitField] ?? null;

            if (limitPaise !== null && limitPaise !== undefined) {
                savings = (limitPaise - totalPaise) / 100;
            }
        }

        return res.status(200).json({
            success: true,
            expenses,
            totalExpense,
            savings
        });
    } catch (err) {
        console.error("Get report failed:", err.message);

        return res.status(500).json({
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