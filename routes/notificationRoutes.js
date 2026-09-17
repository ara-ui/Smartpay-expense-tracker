const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authentication");
const {
    listNotifications,
    markNotificationRead,
    markAllNotificationsRead
} = require("../controller/notificationController");

router.get("/", authenticate, listNotifications);
router.patch("/read-all", authenticate, markAllNotificationsRead);
router.patch("/:id/read", authenticate, markNotificationRead);

module.exports = router;
