const errorHandler = (err, req, res, next) => {
    // Log full detail server-side only.
    console.error(err);

    if (res.headersSent) {
        return next(err);
    }

    // Invalid ObjectId passed as a route param (e.g. /expense/deleteexpense/:id)
    if (err.name === "CastError") {
        return res.status(400).json({
            success: false,
            message: "Invalid request"
        });
    }

    // Mongoose schema validation failure
    if (err.name === "ValidationError") {
        return res.status(400).json({
            success: false,
            message: "Invalid input"
        });
    }

    // Duplicate unique-index write (e.g. email already registered)
    if (err.code === 11000) {
        return res.status(409).json({
            success: false,
            message: "Resource already exists"
        });
    }

    // Malformed/invalid JWT
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        return res.status(401).json({
            success: false,
            message: "User not Authorized"
        });
    }

    // Malformed JSON body (express.json())
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({
            success: false,
            message: "Invalid request body"
        });
    }

    return res.status(err.status || 500).json({
        success: false,
        message: "Something went wrong"
    });
};

module.exports = errorHandler;
