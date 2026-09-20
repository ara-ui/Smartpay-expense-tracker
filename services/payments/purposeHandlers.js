const { User } = require("../../model");
const { createExpenseFromPayment } = require("./expensePaymentService");

const handlers = {
    PREMIUM_MEMBERSHIP: async ({ order, session }) => {

        const user = await User.findById(order.userId).session(session);

        if (!user) {
            throw new Error("Payment owner no longer exists");
        }

        user.isPremiumUser = true;
        await user.save({ session });
    },

    EXPENSE_PAYMENT: async ({ order, session }) => {
        return createExpenseFromPayment({ order, session });
    }
};

const applyPurposeEffect = async ({ order, session }) => {
    const handler = handlers[order.purpose];

    if (!handler) {
        throw new Error(`Unsupported payment purpose: ${order.purpose}`);
    }

    return await handler({ order, session });
};

module.exports = { applyPurposeEffect };
