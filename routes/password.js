const express = require("express");
const router = express.Router();

const passwordController = require("../controller/password");
const authenticate = require("../middleware/authentication");
const { otpLimiter, authLimiter } = require("../middleware/rateLimiter");


router.post("/forgotpassword", otpLimiter, passwordController.forgotPassword);

router.get('/resetpassword/:id',passwordController.resetPassword);

router.post("/updatepassword/:id", otpLimiter, passwordController.updatePassword);

router.post("/verify-budget-access",authenticate,authLimiter,passwordController.verifyBudgetAccess);

router.post("/changepassword/request",authenticate,otpLimiter,passwordController.requestChangePassword);

router.post("/changepassword/verify",authenticate,otpLimiter,passwordController.verifyChangePassword);


module.exports = router;