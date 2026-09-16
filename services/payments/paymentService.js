const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../../model/Order");
const { getProvider } = require("./providerRegistry");
const { applyPurposeEffect } = require("./purposeHandlers");
const { upsertTransaction } = require("./transactionService");
const { validateExpensePaymentInput } = require("./expensePaymentService");

const PROCESSING_LEASE_MS = 2 * 60 * 1000;

const requireIdempotencyKey = (value) => {
    if (typeof value !== "string" || !value.trim()) {
        const error = new Error("Idempotency-Key is required");
        error.code = "INVALID_IDEMPOTENCY_KEY";
        throw error;
    }
    const key = value.trim();
    if (key.length < 8 || key.length > 128) {
        const error = new Error("Invalid idempotency key");
        error.code = "INVALID_IDEMPOTENCY_KEY";
        throw error;
    }
    return key;
};

const fingerprint = ({ purpose, amountMinor, currency, remark }) =>
    crypto.createHash("sha256")
        .update(JSON.stringify({
            purpose,
            amountMinor,
            currency,
            remark: remark || null
        }))
        .digest("hex");

const getExistingIdempotentOrder = async ({ userId, idempotencyKey, purpose, requestFingerprint }) => {
    const existing = await Order.findOne({ userId, idempotencyKey });
    if (!existing) return null;

    if (existing.purpose !== purpose || existing.idempotencyFingerprint !== requestFingerprint) {
        const error = new Error("Idempotency-Key was already used for a different payment request");
        error.code = "IDEMPOTENCY_CONFLICT";
        throw error;
    }

    return existing;
};

const createOrder = async ({
    user,
    purpose,
    amountMinor,
    currency,
    remark = null,
    expenseCategory = null,
    idempotencyKey,
    returnUrl,
    notifyUrl
}) => {
    const key = requireIdempotencyKey(idempotencyKey);
    const requestFingerprint = fingerprint({ purpose, amountMinor, currency, remark });

    const existing = await getExistingIdempotentOrder({
        userId: user._id,
        idempotencyKey: key,
        purpose,
        requestFingerprint
    });

    if (existing) {
        if (!existing.paymentSessionId && existing.status !== "FAILED") {
            throw Object.assign(new Error("Payment order is still being created"), {
                code: "PAYMENT_ORDER_PROCESSING"
            });
        }
        return {
            orderId: existing.orderId,
            paymentSessionId: existing.paymentSessionId,
            category: existing.expenseCategory,
            reused: true
        };
    }

    const order = await Order.create({
        orderId: `ORDER_${crypto.randomUUID().replace(/-/g, "")}`,
        provider: "cashfree",
        purpose,
        amountMinor,
        currency,
        remark,
        expenseCategory,
        status: "PENDING",
        userId: user._id,
        idempotencyKey: key,
        idempotencyFingerprint: requestFingerprint
    }).catch(async (err) => {
        if (err.code !== 11000) throw err;
        const raced = await getExistingIdempotentOrder({
            userId: user._id,
            idempotencyKey: key,
            purpose,
            requestFingerprint
        });
        if (!raced) throw err;
        return raced;
    });

    if (order.paymentSessionId) {
        return {
            orderId: order.orderId,
            paymentSessionId: order.paymentSessionId,
            category: order.expenseCategory,
            reused: true
        };
    }

    try {
        const provider = getProvider(order.provider);
        const created = await provider.createOrder({
            orderId: order.orderId,
            amountMinor: order.amountMinor,
            currency: order.currency,
            user,
            remark: order.remark,
            returnUrl,
            notifyUrl
        });

        order.paymentSessionId = created.paymentSessionId;
        await order.save();

        return {
            orderId: order.orderId,
            paymentSessionId: order.paymentSessionId,
            category: order.expenseCategory
        };
    } catch (err) {
        await Order.updateOne(
            { _id: order._id, status: "PENDING" },
            { $set: { status: "FAILED" } }
        );
        throw err;
    }
};

const createPremiumOrder = async (user, options = {}) =>
    createOrder({
        user,
        purpose: "PREMIUM_MEMBERSHIP",
        amountMinor: 50000,
        currency: "INR",
        idempotencyKey: options.idempotencyKey,
        returnUrl: options.returnUrl,
        notifyUrl: options.notifyUrl
    });

const createExpensePaymentOrder = async ({ user, amount, remark, idempotencyKey, returnUrl, notifyUrl }) => {
    if (!user?.isPremiumUser) {
        const error = new Error("Premium membership required");
        error.code = "PREMIUM_REQUIRED";
        throw error;
    }

    let input;
    try {
        input = await validateExpensePaymentInput({
            userId: user._id,
            amount,
            remark
        });
    } catch (err) {
        if (!err.code && /Amount/.test(err.message || "")) err.code = "INVALID_AMOUNT";
        throw err;
    }

    return createOrder({
        user,
        purpose: "EXPENSE_PAYMENT",
        amountMinor: input.amountPaise,
        currency: "INR",
        remark: input.remark,
        expenseCategory: input.category,
        idempotencyKey,
        returnUrl,
        notifyUrl
    });
};

const getOrderForUser = async (orderId, userId) =>
    Order.findOne({ orderId, userId });

const claimOrder = async (orderId, userId) => {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - PROCESSING_LEASE_MS);

    return Order.findOneAndUpdate(
        {
            orderId,
            userId,
            $or: [
                { status: "PENDING" },
                { status: "PROCESSING", processingStartedAt: { $lt: staleBefore } }
            ]
        },
        { $set: { status: "PROCESSING", processingStartedAt: now } },
        { new: true }
    );
};

const verifyAndApply = async ({ orderId, userId }) => {
    const existing = await getOrderForUser(orderId, userId);
    if (!existing) return { state: "NOT_FOUND" };

    if (existing.status === "SUCCESSFUL") {
        await upsertTransaction({ order: existing, status: "SUCCESS" });
        return { state: "SUCCESS", order: existing };
    }

    if (existing.status === "FAILED") {
        await upsertTransaction({ order: existing, status: "FAILED" });
        return { state: "FAILED", order: existing };
    }

    const order = await claimOrder(orderId, userId);
    if (!order) {
        const current = await getOrderForUser(orderId, userId);
        if (current?.status === "SUCCESSFUL") return { state: "SUCCESS", order: current };
        if (current?.status === "FAILED") return { state: "FAILED", order: current };
        return { state: "PROCESSING", order: current };
    }

    const provider = getProvider(order.provider);
    const payment = await provider.getPayments(order.orderId, {
        amountMinor: order.amountMinor,
        currency: order.currency
    });

    if (payment.state === "PENDING") {
        await Order.updateOne(
            { _id: order._id, status: "PROCESSING" },
            { $set: { status: "PENDING" }, $unset: { processingStartedAt: 1 } }
        );
        await upsertTransaction({ order, payment, status: "PENDING" });
        return { state: "PENDING", order };
    }

    if (payment.state === "FAILED") {
        const failedUpdate = {
            $set: { status: "FAILED" },
            $unset: { processingStartedAt: 1 }
        };
        if (payment.paymentId) failedUpdate.$set.paymentId = payment.paymentId;
        await Order.updateOne({ _id: order._id, status: "PROCESSING" }, failedUpdate);
        await upsertTransaction({ order, payment, status: "FAILED" });
        return { state: "FAILED", order };
    }

    const session = await mongoose.startSession();
    try {
        let finalized = false;
        await session.withTransaction(async () => {
            const current = await Order.findOneAndUpdate(
                { _id: order._id, status: "PROCESSING" },
                {
                    $set: {
                        status: "SUCCESSFUL",
                        paymentId: payment.paymentId,
                        processingStartedAt: null
                    }
                },
                { new: true, session }
            );
            if (!current) return;
            finalized = true;

            await upsertTransaction({
                order: current,
                payment,
                status: "SUCCESS",
                session
            });

            await applyPurposeEffect({ order: current, session });
        });

        if (!finalized) {
            const current = await getOrderForUser(orderId, userId);
            return current?.status === "SUCCESSFUL"
                ? { state: "SUCCESS", order: current }
                : { state: "PROCESSING", order: current };
        }

        return { state: "SUCCESS", order: await getOrderForUser(orderId, userId) };
    } finally {
        await session.endSession();
    }
};

const verifyAndApplyByOrderId = async (orderId) => {
    const order = await Order.findOne({ orderId });
    if (!order) return { state: "NOT_FOUND" };
    return verifyAndApply({ orderId, userId: order.userId });
};

module.exports = {
    createPremiumOrder,
    createExpensePaymentOrder,
    getOrderForUser,
    verifyAndApply,
    verifyAndApplyByOrderId
};
