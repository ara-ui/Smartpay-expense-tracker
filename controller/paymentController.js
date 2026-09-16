const { createExpensePaymentOrder } = require("../services/payments/paymentService");
const { getHistory, getTransactionDetails } = require("../services/payments/paymentHistoryService");
const { getCashfreeReturnUrl, getCashfreeNotifyUrl } = require("../utils/paymentCallback");

exports.createExpensePayment = async (req, res) => {
    try {
        const { amount, remark } = req.body;
        const result = await createExpensePaymentOrder({
            user: req.user,
            amount,
            remark,
            idempotencyKey: req.get("Idempotency-Key"),
            returnUrl: getCashfreeReturnUrl(req),
            notifyUrl: getCashfreeNotifyUrl(req)
        });

        return res.status(201).json({
            success: true,
            payment_session_id: result.paymentSessionId,
            order_id: result.orderId
        });
    } catch (err) {
        console.error("Expense payment order creation failed:", err);
        const status =
            err.code === "BUDGET_EXCEEDED" ? 409 :
            ["INVALID_REMARK", "INVALID_AMOUNT", "INVALID_IDEMPOTENCY_KEY"].includes(err.code) ? 400 :
            ["IDEMPOTENCY_CONFLICT", "PAYMENT_ORDER_PROCESSING"].includes(err.code) ? 409 :
            err.code === "PREMIUM_REQUIRED" ? 403 : 502;
        return res.status(status).json({
            success: false,
            code: err.code || "PAYMENT_ORDER_FAILED",
            message: err.message || "Unable to create payment order"
        });
    }
};

exports.getPaymentHistory = async (req, res) => {
    try {
        const payments = await getHistory({ userId: req.user._id, limit: req.query.limit });
        return res.status(200).json({ success: true, payments });
    } catch (err) {
        console.error("Payment history failed:", err);
        return res.status(500).json({ success: false, message: "Unable to load payment history" });
    }
};

exports.getPaymentDetails = async (req, res) => {
    try {
        const payment = await getTransactionDetails({
            userId: req.user._id,
            transactionId: req.params.id
        });
        if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
        return res.status(200).json({ success: true, payment });
    } catch (err) {
        console.error("Payment details failed:", err);
        return res.status(500).json({ success: false, message: "Unable to load payment details" });
    }
};
