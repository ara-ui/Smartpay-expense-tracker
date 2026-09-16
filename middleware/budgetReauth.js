const { verifyBudgetReauthToken } = require("../utils/budgetReauth");

module.exports = (req, res, next) => {
    try {
        const token = req.header("X-Budget-Reauth-Token");

        if (!token) {
            return res.status(403).json({
                success: false,
                message: "Budget changes require password verification"
            });
        }

        verifyBudgetReauthToken(token, req.user._id);
        next();
    } catch (err) {
        return res.status(403).json({
            success: false,
            message: "Budget verification expired. Please verify your password again."
        });
    }
};
