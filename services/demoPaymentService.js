const mongoose = require("mongoose");
const crypto = require("crypto");
const User = require("../model/User");
const Expense = require("../model/Expense");
const DemoTransfer = require("../model/DemoTransfer");
const { Transaction } = require("../model");
const { enforceExpenseBudget, amountToPaise, notifyBudgetThresholds } = require("./budgetService");
const { getLocalCategory } = require("./aiService");
const { notify } = require("./notificationService");

const DEMO_ENABLED = String(process.env.DEMO_PAYMENTS_ENABLED ?? "true").toLowerCase() !== "false";
const INITIAL_BALANCE_MINOR = 1000000; // ₹10,000 virtual demo balance

const makePaymentId = (name) => {
    const firstName = String(name || "user").trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
    return `${firstName}@smartpay`;
};

const ensurePaymentId = async (user, session) => {
    if (user.paymentId) return user.paymentId;

    const base = makePaymentId(user.name);
    let paymentId = base;
    let suffix = 1;

    // Bounded retry: if a concurrent signup/save claims the same
    // candidate paymentId first, the unique index rejects our save
    // with E11000. Rather than let that bubble up as a request
    // failure, move to the next suffix and try again.
    for (let attempt = 0; attempt < 20; attempt++) {
        const query = User.exists({ paymentId, _id: { $ne: user._id } });
        if (session) query.session(session);
        if (await query) {
            paymentId = `${base.replace("@smartpay", "")}${suffix}@smartpay`;
            suffix += 1;
            continue;
        }

        user.paymentId = paymentId;
        try {
            await user.save({ session });
            return paymentId;
        } catch (err) {
            if (err.code !== 11000) throw err;
            paymentId = `${base.replace("@smartpay", "")}${suffix}@smartpay`;
            suffix += 1;
        }
    }

    throw Object.assign(new Error("Unable to assign a unique SmartPay Payment ID"), {
        code: "PAYMENT_ID_ASSIGNMENT_FAILED"
    });
};

const requireEnabled = () => {
    if (!DEMO_ENABLED) {
        throw Object.assign(new Error("Demo Payment Mode is disabled"), { code: "DEMO_DISABLED" });
    }
};


const getWallet = async ({ userId }) => {
    requireEnabled();
    const user = await User.findById(userId).select("name email paymentId demoBalanceMinor");
    if (!user) throw Object.assign(new Error("User not found"), { code: "USER_NOT_FOUND" });

    if (!Number.isInteger(user.demoBalanceMinor) || user.demoBalanceMinor < 0) {
        user.demoBalanceMinor = INITIAL_BALANCE_MINOR;
        await user.save();
    }

    const paymentId = await ensurePaymentId(user);

    return {
        userId: user._id,
        name: user.name,
        email: user.email,
        paymentId,
        balanceMinor: user.demoBalanceMinor,
        currency: "INR",
        demo: true
    };
};

const getDemoHistory = async ({ userId, limit = 20 }) => {
    requireEnabled();
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    return DemoTransfer.find({ $or: [{ senderId: userId }, { receiverId: userId }] })
        .populate("senderId", "name email paymentId")
        .populate("receiverId", "name email paymentId")
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .lean();
};

const transferDemoCredits = async ({ userId, recipientPaymentId, amount, remark, idempotencyKey }) => {
    requireEnabled();

    const paymentId = String(recipientPaymentId || "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]*@smartpay$/.test(paymentId)) {
        throw Object.assign(new Error("Enter a valid SmartPay Payment ID"), { code: "INVALID_RECIPIENT_ID" });
    }

    const amountMinor = amountToPaise(amount);
    const cleanRemark = String(remark || "").trim();
    if (!cleanRemark || cleanRemark.length > 200) {
        throw Object.assign(new Error("Remark must be between 1 and 200 characters"), { code: "INVALID_REMARK" });
    }
    if (!idempotencyKey || String(idempotencyKey).length < 16) {
        throw Object.assign(new Error("A valid idempotency key is required"), { code: "INVALID_IDEMPOTENCY_KEY" });
    }

    const existing = await DemoTransfer.findOne({ senderId: userId, idempotencyKey: String(idempotencyKey) })
        .populate("receiverId", "name email paymentId")
        .lean();
    if (existing) return { transfer: existing, reused: true };

    const session = await mongoose.startSession();
    try {
        let transfer;
        let budgetChecks = [];
        let senderInfo = null;
        let receiverInfo = null;
        await session.withTransaction(async () => {
            const sender = await User.findById(userId).select("name email paymentId demoBalanceMinor").session(session);
            if (!sender) throw Object.assign(new Error("Sender not found"), { code: "USER_NOT_FOUND" });

            await ensurePaymentId(sender, session);

            const receiver = await User.findOne({ paymentId }).select("name email paymentId demoBalanceMinor").session(session);
            if (!receiver) {
                throw Object.assign(new Error("No SmartPay account with that Payment ID exists"), { code: "RECIPIENT_NOT_FOUND" });
            }
            if (String(receiver._id) === String(sender._id)) {
                throw Object.assign(new Error("You cannot transfer demo credits to yourself"), { code: "SELF_TRANSFER" });
            }

            if (!Number.isInteger(sender.demoBalanceMinor) || sender.demoBalanceMinor < 0) sender.demoBalanceMinor = INITIAL_BALANCE_MINOR;
            if (!Number.isInteger(receiver.demoBalanceMinor) || receiver.demoBalanceMinor < 0) receiver.demoBalanceMinor = INITIAL_BALANCE_MINOR;

            if (sender.demoBalanceMinor < amountMinor) {
                throw Object.assign(new Error("Insufficient virtual demo balance"), {
                    code: "INSUFFICIENT_DEMO_BALANCE",
                    details: { balanceMinor: sender.demoBalanceMinor, requestedMinor: amountMinor }
                });
            }

            const expenseCategory = getLocalCategory(cleanRemark) || "Other";

            const budgetResult = await enforceExpenseBudget({
                userId: sender._id,
                amount: amountMinor / 100,
                category: expenseCategory,
                session
            });
            budgetChecks = budgetResult.checks;

            sender.demoBalanceMinor -= amountMinor;
            sender.totalExpense = Number(sender.totalExpense || 0) + amountMinor / 100;
            receiver.demoBalanceMinor += amountMinor;

            await sender.save({ session });
            await receiver.save({ session });

            const createdExpenses = await Expense.create([{
                amount: amountMinor / 100,
                description: cleanRemark,
                category: expenseCategory,
                note: `Demo transfer to ${receiver.name} (${receiver.email})`,
                userId: sender._id
            }], { session });
            const expense = createdExpenses[0];

            const transferId = `DEMO_${crypto.randomUUID().replace(/-/g, "")}`;
            const created = await DemoTransfer.create([{
                transferId,
                senderId: sender._id,
                receiverId: receiver._id,
                recipientEmail: receiver.email,
                recipientName: receiver.name,
                amountMinor,
                currency: "INR",
                remark: cleanRemark,
                status: "SUCCESSFUL",
                idempotencyKey: String(idempotencyKey),
                senderBalanceAfterMinor: sender.demoBalanceMinor,
                receiverBalanceAfterMinor: receiver.demoBalanceMinor
            }], { session });
            transfer = created[0];

            await Transaction.create([{
                userId: sender._id,
                orderId: transferId,
                provider: "demo",
                purpose: "INTERNAL_TRANSFER_SENT",
                amountMinor,
                currency: "INR",
                providerTransactionId: transferId,
                remark: cleanRemark,
                recipientType: "USER",
                recipientName: receiver.name,
                recipientValueMasked: receiver.email,
                expenseId: expense._id,
                status: "SUCCESSFUL",
                paymentMethod: "DEMO_TRANSFER",
                transactionDate: new Date()
            }], { session });

            senderInfo = { id: sender._id, name: sender.name };
            receiverInfo = { id: receiver._id, name: receiver.name };
        });

        const fresh = await DemoTransfer.findById(transfer._id)
            .populate("receiverId", "name email")
            .lean();

        // Non-critical side effects - fired only after the money transfer
        // has actually committed, never inside the transaction itself.
        const rupees = (amountMinor / 100).toFixed(2);
        notify({
            userId: senderInfo.id,
            type: "MONEY_SENT",
            title: "Money sent",
            message: `₹${rupees} was sent to ${receiverInfo.name}.`,
            amountMinor,
            relatedTransferId: transfer._id
        }).catch(() => {});
        notify({
            userId: receiverInfo.id,
            type: "MONEY_RECEIVED",
            title: "Money received",
            message: `You received ₹${rupees} from ${senderInfo.name}.`,
            amountMinor,
            relatedTransferId: transfer._id
        }).catch(() => {});
        notifyBudgetThresholds(senderInfo.id, budgetChecks).catch(() => {});

        return { transfer: fresh, reused: false };
    } catch (err) {
        if (err.code === 11000) {
            const raced = await DemoTransfer.findOne({ senderId: userId, idempotencyKey: String(idempotencyKey) })
                .populate("receiverId", "name email")
                .lean();
            if (raced) return { transfer: raced, reused: true };
        }
        throw err;
    } finally {
        await session.endSession();
    }
};

module.exports = { DEMO_ENABLED, ensurePaymentId, getWallet, getDemoHistory, transferDemoCredits };
