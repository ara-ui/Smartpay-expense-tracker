const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
} = require("../services/notificationService");

exports.listNotifications = async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 20;
        const [notifications, unreadCount] = await Promise.all([
            getNotifications(req.user._id, { limit }),
            getUnreadCount(req.user._id)
        ]);

        res.status(200).json({ success: true, notifications, unreadCount });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Unable to load notifications"
        });
    }
};

exports.markNotificationRead = async (req, res) => {
    try {
        await markAsRead(req.user._id, req.params.id);
        const unreadCount = await getUnreadCount(req.user._id);
        res.status(200).json({ success: true, unreadCount });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Unable to update notification"
        });
    }
};

exports.markAllNotificationsRead = async (req, res) => {
    try {
        await markAllAsRead(req.user._id);
        res.status(200).json({ success: true, unreadCount: 0 });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Unable to update notifications"
        });
    }
};
