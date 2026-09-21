const {
    DEMO_ENABLED,
    getWallet,
    getDemoHistory,
    transferDemoCredits
} = require("../services/demoPaymentService");

const sendError = (res, err) => {
    const statusMap = {
        DEMO_DISABLED: 404,
        INVALID_RECIPIENT_ID: 400,
        INVALID_RECIPIENT_EMAIL: 400,
        INVALID_REMARK: 400,
        INVALID_IDEMPOTENCY_KEY: 400,
        RECIPIENT_NOT_FOUND: 404,
        SELF_TRANSFER: 400,
        INSUFFICIENT_DEMO_BALANCE: 409,
        BUDGET_EXCEEDED: 409
    };
    const status = statusMap[err.code] || 500;
    return res.status(status).json({
        success: false,
        code: err.code || "DEMO_PAYMENT_FAILED",
        message: status === 500
            ? "Unable to process demo transfer"
            : (err.message || "Unable to process demo transfer"),
        ...(err.details ? { details: err.details } : {})
    });
};

exports.getWallet = async (req, res) => {
    try {
        const wallet = await getWallet({ userId: req.user._id });
        return res.json({ success: true, wallet });
    } catch (err) {
        console.error("Demo wallet failed:", err);
        return sendError(res, err);
    }
};

exports.transfer = async (req, res) => {
    try {
        const result = await transferDemoCredits({
            userId: req.user._id,
            recipientPaymentId: req.body.recipientPaymentId || req.body.recipientEmail,
            amount: req.body.amount,
            remark: req.body.remark,
            idempotencyKey: req.get("Idempotency-Key")
        });
        return res.status(result.reused ? 200 : 201).json({
            success: true,
            demo: true,
            reused: result.reused,
            message: result.reused ? "Demo transfer already completed" : "Demo transfer successful",
            transfer: result.transfer
        });
    } catch (err) {
        console.error("Demo transfer failed:", err);
        return sendError(res, err);
    }
};

exports.history = async (req, res) => {
    try {
        const transfers = await getDemoHistory({ userId: req.user._id, limit: req.query.limit });
        return res.json({ success: true, demo: true, transfers });
    } catch (err) {
        console.error("Demo transfer history failed:", err);
        return sendError(res, err);
    }
};

exports.status = (req, res) => res.json({ success: true, demo: DEMO_ENABLED });
