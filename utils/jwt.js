const jwt = require("jsonwebtoken");

const generateAccessToken = (id, name, email, isPremiumUser) => {
    return jwt.sign(
        {
            userId: id,
            name,
            email,
            isPremiumUser
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

const generateBudgetReauthToken = (userId) => {
    return jwt.sign(
        {
            userId: String(userId),
            purpose: "BUDGET_EDIT"
        },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
    );
};

const verifyBudgetReauthToken = (token, userId) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return (
        decoded.purpose === "BUDGET_EDIT" &&
        String(decoded.userId) === String(userId)
    );
};

module.exports = {
    generateAccessToken,
    generateBudgetReauthToken,
    verifyBudgetReauthToken
};
