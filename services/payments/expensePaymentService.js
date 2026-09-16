const mongoose = require("mongoose");
const Expense = require("../../model/Expense");
const Transaction = require("../../model/Transaction");
const { User } = require("../../model");
const aiService = require("../aiService");
const { CATEGORIES } = require("../../utils/categories");
const { enforceExpenseBudget, checkExpenseBudget, amountToPaise } = require("../budgetService");

const categorizeRemark = async (remark) => {
    let category = "Other";
    try {
        category = await aiService.getCategory(remark);
    } catch (err) {
        console.log("Payment expense categorization failed:", err.message);
    }
    return CATEGORIES.includes(category) ? category : "Other";
};

const validateExpensePaymentInput = async ({ userId, amount, remark }) => {
    const amountPaise = amountToPaise(amount);
    if (!remark || typeof remark !== "string" || !remark.trim()) {
        throw Object.assign(new Error("Remark is required"), { code: "INVALID_REMARK" });
    }
    if (remark.trim().length > 200) {
        throw Object.assign(new Error("Remark must be 200 characters or fewer"), { code: "INVALID_REMARK" });
    }

    const category = await categorizeRemark(remark.trim());
    await checkExpenseBudget({ userId, amount, category });
    return { amountPaise, category, remark: remark.trim() };
};

const createExpenseFromPayment = async ({ order, session }) => {
    if (order.purpose !== "EXPENSE_PAYMENT") return null;

    const existingTransaction = await Transaction.findOne({
        provider: order.provider,
        orderId: order.orderId
    }).session(session);

    if (existingTransaction?.expenseId) {
        return Expense.findById(existingTransaction.expenseId).session(session);
    }

    const user = await User.findById(order.userId).session(session);
    if (!user) throw new Error("Payment owner no longer exists");

    const amount = order.amountMinor / 100;
    const category = order.expenseCategory || "Other";

    // The same budget enforcement used by manual expenses is applied here.
    await enforceExpenseBudget({
        userId: order.userId,
        amount,
        category,
        session,
        date: new Date()
    });

    const created = await Expense.create([{
        amount,
        description: order.remark,
        category,
        note: "Automatically created from Cashfree payment",
        userId: order.userId
    }], { session });

    const expense = created[0];

    user.totalExpense = Number(user.totalExpense) + amount;
    await user.save({ session });

    await Transaction.updateOne(
        { provider: order.provider, orderId: order.orderId },
        {
            $set: {
                remark: order.remark,
                expenseId: expense._id
            }
        },
        { session }
    );

    return expense;
};

module.exports = {
    validateExpensePaymentInput,
    categorizeRemark,
    createExpenseFromPayment
};
