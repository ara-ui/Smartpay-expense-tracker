const jwt = require("jsonwebtoken");
const { User } = require("../model");

const authenticate = async (req, res, next) => {
    try {
        const token = req.header("Authorization");

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return res.status(401).json({
                message: "User not Authorized"
            });
        }

        req.user = user;

        next();
    } catch (err) {
        return res.status(401).json({
            message: "User not Authorized"
        });
    }
};

module.exports = authenticate;