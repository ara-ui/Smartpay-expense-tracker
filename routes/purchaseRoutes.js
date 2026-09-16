const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authentication");
const { paymentLimiter } = require("../middleware/rateLimiter");
const {
    purchasePremium,
    updateTransactionStatus,
    cashfreeReturn
} = require("../controller/purchaseController");

router.get("/premiummembership", authenticate, paymentLimiter, purchasePremium);
router.get("/cashfree/return", cashfreeReturn);
router.post("/updatetransactionstatus", authenticate, paymentLimiter, updateTransactionStatus);

module.exports = router;
