const Transaction = require("../../model/Transaction");

const STATUS_MAP = {
    PENDING: "PENDING",
    SUCCESS: "SUCCESSFUL",
    FAILED: "FAILED"
};

const normalizePaymentMethod = (payment) => {
    const method = payment?.payment_method;
    if (typeof method === "string" && method.trim()) return method.trim();

    if (method && typeof method === "object") {
        const key = Object.keys(method)[0];
        return key || null;
    }

    return null;
};

const upsertTransaction = async ({ order, payment = null, status, session = null }) => {
    const normalizedStatus = STATUS_MAP[status] || status;
    const providerTransactionId = payment?.paymentId || payment?.cf_payment_id || null;
    const paymentMethod = normalizePaymentMethod(payment?.raw);
    const transactionDate =
        payment?.raw?.payment_completion_time ||
        payment?.raw?.payment_time ||
        (normalizedStatus === "SUCCESSFUL" ? new Date() : null);

    const update = {
        $set: {
            userId: order.userId,
            purpose: order.purpose,
            amountMinor: order.amountMinor,
            currency: order.currency,
            status: normalizedStatus,
            paymentMethod,
            transactionDate: transactionDate ? new Date(transactionDate) : null,
            remark: order.remark || null
        },
        $setOnInsert: {
            provider: order.provider,
            orderId: order.orderId
        }
    };

    if (providerTransactionId) {
        update.$set.providerTransactionId = String(providerTransactionId);
    }

    let query = Transaction.findOneAndUpdate(
        { provider: order.provider, orderId: order.orderId },
        update,
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (session) query = query.session(session);

    return query;
};

module.exports = { upsertTransaction };
