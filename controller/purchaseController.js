const { generateAccessToken } = require("../utils/jwt");
const { createPremiumOrder, verifyAndApply } = require("../services/payments/paymentService");
const { processCashfreeWebhook } = require("../services/payments/webhookService");
const { getCashfreeReturnUrl, getCashfreeNotifyUrl } = require("../utils/paymentCallback");

const successResponse = (res, user, order) => {
    const token = generateAccessToken(user._id, user.name, user.email, true);
    return res.status(200).json({
        success: true,
        message: "Transaction Successful",
        token,
        order_id: order.orderId,
        purpose: order.purpose,
        redirect_to: order.purpose === "EXPENSE_PAYMENT" ? "payments.html" : "expense.html"
    });
};

exports.purchasePremium = async (req, res) => {
    try {
        if (req.user.isPremiumUser) {
            return res.status(409).json({ success: false, message: "User is already a premium member" });
        }

        const result = await createPremiumOrder(req.user, {
            idempotencyKey: req.get("Idempotency-Key"),
            returnUrl: getCashfreeReturnUrl(req),
            notifyUrl: getCashfreeNotifyUrl(req)
        });

        return res.status(201).json({
            success: true,
            payment_session_id: result.paymentSessionId,
            order_id: result.orderId,
            cashfree_mode: String(process.env.CASHFREE_ENVIRONMENT || "sandbox").trim().toLowerCase() === "production"
                ? "production"
                : "sandbox"
        });
    } catch (err) {
        console.error("Payment order creation failed:", err);
        const status =
            ["INVALID_IDEMPOTENCY_KEY"].includes(err.code) ? 400 :
            ["IDEMPOTENCY_CONFLICT", "PAYMENT_ORDER_PROCESSING"].includes(err.code) ? 409 : 502;
        return res.status(status).json({
            success: false,
            code: err.code || "PAYMENT_ORDER_FAILED",
            message: status === 502 ? "Unable to create payment order" : err.message
        });
    }
};

exports.updateTransactionStatus = async (req, res) => {
    try {
        const { order_id: orderId } = req.body;
        if (typeof orderId !== "string" || !orderId.trim()) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required"
            });
        }

        const result = await verifyAndApply({ orderId, userId: req.user._id });

        if (result.state === "NOT_FOUND") return res.status(404).json({ success: false, message: "Order Not Found" });
        if (result.state === "SUCCESS") return successResponse(res, req.user, result.order);
        if (result.state === "PROCESSING" || result.state === "PENDING") {
            return res.status(202).json({
                success: false,
                pending: true,
                purpose: result.order?.purpose,
                redirect_to: result.order?.purpose === "EXPENSE_PAYMENT" ? "payments.html" : "expense.html",
                message: "Payment is still being processed. Please check again."
            });
        }
        return res.status(400).json({
            success: false,
            purpose: result.order?.purpose,
            redirect_to: result.order?.purpose === "EXPENSE_PAYMENT" ? "payments.html" : "expense.html",
            message: "Payment was not successful"
        });
    } catch (err) {
        console.error("Payment verification failed:", err);
        const clientCodes = ["PAYMENT_AMOUNT_MISMATCH", "PAYMENT_CURRENCY_MISMATCH", "INVALID_PROVIDER_ORDER"];
        return res.status(clientCodes.includes(err.code) ? 409 : 502).json({
            success: false,
            code: err.code || "PAYMENT_VERIFICATION_FAILED",
            message: clientCodes.includes(err.code) ? err.message : "Unable to verify payment"
        });
    }
};

exports.cashfreeReturn = async (req, res) => {
    const orderId = typeof req.query.order_id === "string" ? req.query.order_id.trim() : "";
    const query = orderId ? `?order_id=${encodeURIComponent(orderId)}` : "";

    return res.redirect(303, `/payment-status.html${query}`);
};

exports.cashfreeWebhook = async (req, res) => {
    try {
        const signature = req.header("x-webhook-signature");
        const timestamp = req.header("x-webhook-timestamp");
        const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
        const result = await processCashfreeWebhook({ signature, timestamp, rawBody });
        return res.status(200).json({ success: true, duplicate: Boolean(result.duplicate), state: result.state });
    } catch (err) {
        console.error("Cashfree webhook processing failed:", err);
        if (err.code === "INVALID_WEBHOOK_SIGNATURE") {
            return res.status(401).json({ success: false, message: "Invalid webhook signature" });
        }
        if (err.code === "INVALID_WEBHOOK_JSON") {
            return res.status(400).json({ success: false, message: "Invalid webhook" });
        }
        return res.status(500).json({ success: false, message: "Webhook processing failed" });
    }
};
