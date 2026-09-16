const jwt = require("jsonwebtoken");

const BUDGET_REAUTH_PURPOSE = "BUDGET_EDIT";
const BUDGET_REAUTH_TTL = "15m";

function createBudgetReauthToken(userId) {
    return jwt.sign(
        {
            userId: String(userId),
            purpose: BUDGET_REAUTH_PURPOSE
        },
        process.env.JWT_SECRET,
        { expiresIn: BUDGET_REAUTH_TTL }
    );
}

function verifyBudgetReauthToken(token, userId) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (
        decoded.purpose !== BUDGET_REAUTH_PURPOSE ||
        String(decoded.userId) !== String(userId)
    ) {
        throw new Error("Invalid budget re-authentication token");
    }

    return decoded;
}

module.exports = {
    BUDGET_REAUTH_PURPOSE,
    createBudgetReauthToken,
    verifyBudgetReauthToken
};
