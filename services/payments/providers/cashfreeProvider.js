const crypto = require("crypto");
const { Cashfree } = require("cashfree-pg");

const CASHFREE_API_VERSION = "2022-09-01";
const isProduction = process.env.CASHFREE_ENVIRONMENT === "production";

Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = isProduction
    ? Cashfree.Environment.PRODUCTION
    : Cashfree.Environment.SANDBOX;

const getAppUrl = () => {
    const appUrl = process.env.APP_URL;
    if (!appUrl) throw new Error("APP_URL is required for payment callbacks");
    return appUrl.replace(/\/+$/, "");
};

const toRupees = (amountMinor) => amountMinor / 100;

const createOrder = async ({
    orderId,
    amountMinor,
    currency,
    user,
    remark = null,
    returnUrl = null,
    notifyUrl = null
}) => {
    const appUrl = getAppUrl();
    const resolvedReturnUrl = returnUrl || `${appUrl}/purchase/cashfree/return`;
    const resolvedNotifyUrl = notifyUrl || `${appUrl}/purchase/webhook/cashfree`;

    const request = {
        order_id: orderId,
        order_amount: toRupees(amountMinor),
        order_currency: currency,
        ...(remark ? { order_note: remark } : {}),
        customer_details: {
            customer_id: user._id.toString(),
            customer_email: user.email,
            customer_phone:
                user.phone ||
                process.env.CASHFREE_DEFAULT_CUSTOMER_PHONE ||
                "9999999999"
        },
        order_meta: {
            return_url: resolvedReturnUrl,
            notify_url: resolvedNotifyUrl
        }
    };

    const response = await Cashfree.PGCreateOrder(
        CASHFREE_API_VERSION,
        request,
        orderId,
        orderId
    );

    if (!response.data || response.data.order_id !== orderId || !response.data.payment_session_id) {
        throw new Error("Cashfree returned an invalid create-order response");
    }

    return {
        providerOrderId: response.data.order_id,
        paymentSessionId: response.data.payment_session_id
    };
};

const getPayments = async (orderId, expected = {}) => {
    const orderResponse = await Cashfree.PGFetchOrder(CASHFREE_API_VERSION, orderId);
    const providerOrder = orderResponse.data;

    if (!providerOrder || providerOrder.order_id !== orderId) {
        const error = new Error("Cashfree returned an invalid order response");
        error.code = "INVALID_PROVIDER_ORDER";
        throw error;
    }

    if (expected.amountMinor && Number(providerOrder.order_amount) !== toRupees(expected.amountMinor)) {
        const error = new Error("Cashfree order amount does not match the local order");
        error.code = "PAYMENT_AMOUNT_MISMATCH";
        throw error;
    }

    if (expected.currency && providerOrder.order_currency !== expected.currency) {
        const error = new Error("Cashfree order currency does not match the local order");
        error.code = "PAYMENT_CURRENCY_MISMATCH";
        throw error;
    }

    const response = await Cashfree.PGOrderFetchPayments(CASHFREE_API_VERSION, orderId);
    const payments = Array.isArray(response.data) ? response.data : [];

    const successful = payments.find((payment) => payment.payment_status === "SUCCESS");
    if (successful) {
        if (expected.amountMinor && Number(successful.payment_amount) !== toRupees(expected.amountMinor)) {
            const error = new Error("Cashfree payment amount does not match the local order");
            error.code = "PAYMENT_AMOUNT_MISMATCH";
            throw error;
        }
        return {
            state: "SUCCESS",
            paymentId: successful.cf_payment_id || null,
            raw: successful
        };
    }

    const pending = payments.find((payment) =>
        ["PENDING", "NOT_ATTEMPTED"].includes(payment.payment_status)
    );

    if (pending || payments.length === 0) {
        return {
            state: "PENDING",
            paymentId: pending?.cf_payment_id || null,
            raw: pending || null
        };
    }

    return {
        state: "FAILED",
        paymentId: payments[0]?.cf_payment_id || null,
        raw: payments[0] || null
    };
};

const verifyWebhookSignature = ({ signature, timestamp, rawBody }) => {
    if (!signature || !timestamp || !rawBody) return false;

    const expected = crypto
        .createHmac("sha256", process.env.CASHFREE_SECRET_KEY)
        .update(`${timestamp}${rawBody}`)
        .digest("base64");

    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false;
    }
};

module.exports = { name: "cashfree", createOrder, getPayments, verifyWebhookSignature };
