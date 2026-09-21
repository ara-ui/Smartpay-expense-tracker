require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const requiredEnv = ["MONGODB_URI", "JWT_SECRET"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]?.trim());
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.set("trust proxy", 1);

const { connectDB } = require("./db");

require("./model");

const userRoutes = require("./routes/userRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const { cashfreeWebhook } = require("./controller/purchaseController");
const premiumRoutes = require("./routes/premiumRoutes");
const passwordRoutes = require("./routes/password");
const reportsRoutes = require("./routes/reportsRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const demoPaymentRoutes = require("./routes/demoPaymentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const errorHandler = require("./middleware/errorHandler");

const accessLogStream = fs.createWriteStream(
    path.join(__dirname, "access.log"),
    { flags: "a" }
);

const redactSensitivePath = (url) =>
    String(url || "").replace(
        /(\/password\/resetpassword\/)[^/?\s]+/gi,
        "$1[redacted]"
    );

app.use(
    morgan((tokens, req, res) => [
        tokens["remote-addr"](req, res),
        tokens.method(req, res),
        redactSensitivePath(tokens.url(req, res)),
        tokens.status(req, res),
        tokens.res(req, res, "content-length"),
        tokens["response-time"](req, res),
        "ms"
    ].join(" "), {
        stream: accessLogStream
    })
);

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(cors({
    origin: allowedOrigin
}));

// Cashfree webhook must receive the raw body for signature verification.
app.post(
    "/purchase/webhook/cashfree",
    express.raw({ type: "application/json", limit: "1mb" }),
    cashfreeWebhook
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Routes
app.use("/users", userRoutes);
app.use("/expense", expenseRoutes);
app.use("/purchase", purchaseRoutes);
app.use("/premium", premiumRoutes);
app.use("/password", passwordRoutes);
app.use("/expense", reportsRoutes);
app.use("/budget", budgetRoutes);
app.use("/payments", paymentRoutes);
app.use("/payments/demo", demoPaymentRoutes);
app.use("/notifications", notificationRoutes);

// Central error handler must be registered after all routes.
app.use(errorHandler);

const startServer = async () => {
    if (missingEnv.length) {
        console.error(`Missing required environment variable(s): ${missingEnv.join(", ")}`);
        process.exitCode = 1;
        return;
    }

    try {
        await connectDB();
        console.log("Database connected");

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}.`);
        });
    } catch (err) {
        console.error("Server startup failed:", err.message);
        process.exitCode = 1;
    }
};

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
