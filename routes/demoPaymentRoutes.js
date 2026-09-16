const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authentication");
const requirePremium = require("../middleware/requirePremium");
const { paymentLimiter } = require("../middleware/rateLimiter");
const { getWallet, transfer, history, status } = require("../controller/demoPaymentController");

router.get("/status", status);
router.get("/wallet", authenticate, requirePremium, paymentLimiter, getWallet);
router.get("/history", authenticate, requirePremium, paymentLimiter, history);
router.post("/transfer", authenticate, requirePremium, paymentLimiter, transfer);

module.exports = router;
