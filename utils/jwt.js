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

module.exports = {
    generateAccessToken
};
