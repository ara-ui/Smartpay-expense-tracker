const requirePremium = (req, res, next) => {

    if (!req.user.isPremiumUser) {

        return res.status(403).json({
            success: false,
            message: "Premium membership required"
        });

    }

    next();

};

module.exports = requirePremium;