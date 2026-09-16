const Transaction = require("../../model/Transaction");

const getHistory = async ({ userId, limit = 5 }) => {
    const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 50);
    return Transaction.find({
        userId,
        purpose: { $in: ["EXPENSE_PAYMENT", "INTERNAL_TRANSFER_SENT"] }
    })
        .select("amountMinor currency provider orderId providerTransactionId status paymentMethod transactionDate remark expenseId createdAt purpose recipientType recipientName recipientValueMasked")
        .sort({ transactionDate: -1, createdAt: -1 })
        .limit(safeLimit)
        .lean();
};

const getTransactionDetails = async ({ userId, transactionId }) => {
    return Transaction.findOne({
        _id: transactionId,
        userId,
        purpose: { $in: ["EXPENSE_PAYMENT", "INTERNAL_TRANSFER_SENT"] }
    })
        .select("amountMinor currency provider orderId providerTransactionId status paymentMethod transactionDate remark expenseId createdAt purpose recipientType recipientName recipientValueMasked")
        .lean();
};

module.exports = { getHistory, getTransactionDetails };
