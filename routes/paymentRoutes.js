const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authentication");
const requirePremium = require("../middleware/requirePremium");
const { paymentLimiter } = require("../middleware/rateLimiter");
const {
    createExpensePayment,
    getPaymentHistory,
    getPaymentDetails
} = require("../controller/paymentController");

router.post("/create", authenticate, requirePremium, paymentLimiter, createExpensePayment);
router.get("/history", authenticate, requirePremium, getPaymentHistory);
router.get("/history/:id", authenticate, requirePremium, getPaymentDetails);

module.exports = router;
