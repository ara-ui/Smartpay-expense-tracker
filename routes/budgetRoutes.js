const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authentication");
const budgetReauth = require("../middleware/budgetReauth");
const requirePremium = require("../middleware/requirePremium");
const { authLimiter } = require("../middleware/rateLimiter");
const {
    verifyBudgetPassword,
    getBudgetRules,
    updateBudgetRules,
    upsertCategoryLimit,
    deleteCategoryLimit,
    getBudgetStatus,
    getInsights
} = require("../controller/budgetController");

router.post("/verify-password", authenticate, requirePremium, authLimiter, verifyBudgetPassword);

router.get("/rules", authenticate, requirePremium, getBudgetRules);
router.put("/rules", authenticate, requirePremium, budgetReauth, updateBudgetRules);

router.post("/rules/category", authenticate, requirePremium, budgetReauth, upsertCategoryLimit);
router.delete("/rules/category/:category", authenticate, requirePremium, budgetReauth, deleteCategoryLimit);

router.get("/status", authenticate, requirePremium, getBudgetStatus);
router.get("/insights", authenticate, requirePremium, getInsights);

module.exports = router;
