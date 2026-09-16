const WebhookEvent = require("../../model/WebhookEvent");
const { verifyAndApplyByOrderId } = require("./paymentService");
const cashfreeProvider = require("./providers/cashfreeProvider");

const getEventType = (payload) => payload?.type || payload?.event_type || payload?.eventType || "UNKNOWN";
const getOrderId = (payload) =>
    payload?.data?.order?.order_id || payload?.data?.order?.orderId || payload?.data?.order_id || null;
const getPaymentId = (payload) =>
    payload?.data?.payment?.cf_payment_id || payload?.data?.payment?.payment_id || payload?.data?.cf_payment_id || null;
const getEventTime = (payload) =>
    payload?.event_time || payload?.eventTime || payload?.data?.payment?.payment_time || "";
const buildEventKey = ({ eventType, orderId, paymentId, eventTime }) =>
    [eventType, orderId || "NO_ORDER", paymentId || "NO_PAYMENT", eventTime || "NO_TIME"].join(":");

const recordWebhookEvent = async ({ eventKey, eventType, orderId, paymentId }) => {
    try {
        return await WebhookEvent.create({
            provider: "cashfree",
            eventKey,
            eventType,
            orderId,
            providerTransactionId: paymentId ? String(paymentId) : null,
            signatureVerified: true,
            status: "RECEIVED"
        });
    } catch (err) {
        if (err.code !== 11000) throw err;
        return WebhookEvent.findOne({ provider: "cashfree", eventKey });
    }
};

const claimWebhookEvent = async (event) => {
    if (event.status === "PROCESSED") return { claimed: false, duplicate: true, processing: false };

    const staleBefore = new Date(Date.now() - 2 * 60 * 1000);
    const claimed = await WebhookEvent.findOneAndUpdate(
        {
            _id: event._id,
            $or: [
                { status: "RECEIVED" },
                { status: "FAILED" },
                { status: "PROCESSING", processingStartedAt: { $lt: staleBefore } }
            ]
        },
        {
            $set: {
                status: "PROCESSING",
                processingStartedAt: new Date(),
                errorMessage: null
            }
        },
        { new: true }
    );

    return claimed
        ? { claimed: true, duplicate: false, processing: false }
        : { claimed: false, duplicate: true, processing: true };
};

const processCashfreeWebhook = async ({ signature, timestamp, rawBody }) => {
    if (!cashfreeProvider.verifyWebhookSignature({ signature, timestamp, rawBody })) {
        const error = new Error("Invalid webhook signature");
        error.code = "INVALID_WEBHOOK_SIGNATURE";
        throw error;
    }

    let payload;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        const error = new Error("Invalid webhook JSON");
        error.code = "INVALID_WEBHOOK_JSON";
        throw error;
    }

    const eventType = getEventType(payload);
    const orderId = getOrderId(payload);
    const paymentId = getPaymentId(payload);
    const eventTime = getEventTime(payload);
    const eventKey = buildEventKey({ eventType, orderId, paymentId, eventTime });

    const event = await recordWebhookEvent({ eventKey, eventType, orderId, paymentId });
    const claim = await claimWebhookEvent(event);

    if (!claim.claimed) {
        return {
            duplicate: true,
            state: claim.processing ? "PROCESSING" : "PROCESSED",
            orderId
        };
    }

    try {
        if (!orderId) {
            await WebhookEvent.updateOne(
                { _id: event._id },
                { $set: { status: "PROCESSED", processedAt: new Date() }, $unset: { processingStartedAt: 1 } }
            );
            return { duplicate: false, state: "IGNORED", orderId: null };
        }

        const result = await verifyAndApplyByOrderId(orderId);

        await WebhookEvent.updateOne(
            { _id: event._id },
            { $set: { status: "PROCESSED", processedAt: new Date() }, $unset: { processingStartedAt: 1, errorMessage: 1 } }
        );

        return { duplicate: false, state: result.state, orderId };
    } catch (err) {
        await WebhookEvent.updateOne(
            { _id: event._id },
            { $set: { status: "FAILED", errorMessage: err.message || "Webhook processing failed" }, $unset: { processingStartedAt: 1 } }
        );
        throw err;
    }
};

module.exports = { processCashfreeWebhook };
