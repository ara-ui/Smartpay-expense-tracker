const Notification = require("../model/Notification");

// Creates a notification. For budget-threshold notifications (which set
// `period`), a duplicate for the same user/type/category/period is silently
// ignored rather than erroring, thanks to the model's partial unique index -
// this is what stops a page refresh or repeat expense from re-notifying.
async function notify({
    userId,
    type,
    title,
    message,
    amountMinor = null,
    relatedTransferId = null,
    relatedCategory = null,
    period = null
}) {
    try {
        return await Notification.create({
            userId,
            type,
            title,
            message,
            amountMinor,
            relatedTransferId,
            relatedCategory,
            period
        });
    } catch (err) {
        if (err.code === 11000) return null; // already notified for this threshold/period
        // Notifications are a non-critical side effect of money/budget
        // actions - never let a notification failure surface as an error
        // to the caller of a payment/expense flow.
        console.log("Notification create failed:", err.message);
        return null;
    }
}

async function getNotifications(userId, { limit = 20, skip = 0 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const safeSkip = Math.max(Number(skip) || 0, 0);
    return Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(safeSkip)
        .limit(safeLimit)
        .lean();
}

async function getUnreadCount(userId) {
    return Notification.countDocuments({ userId, isRead: false });
}

async function markAsRead(userId, notificationId) {
    return Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true },
        { new: true }
    );
}

async function markAllAsRead(userId) {
    return Notification.updateMany({ userId, isRead: false }, { isRead: true });
}

module.exports = {
    notify,
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
};
