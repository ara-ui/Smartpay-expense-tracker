require("dotenv").config();

const PORT = process.env.PORT;
const express=require('express');
const app=express();
const { connectDB } = require('./db');
const cors=require('cors');
const helmet = require('helmet');
const path=require('path');

require('./model');

const morgan = require("morgan");
const fs = require("fs");


const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  { flags: "a" }
);

app.use(morgan("combined", { stream: accessLogStream }));

const userRoutes=require('./routes/userRoutes');
const expenseRoutes=require('./routes/expenseRoutes');
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


app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(cors({
    origin: allowedOrigin
}));

app.post(
    "/purchase/webhook/cashfree",
    express.raw({ type: "application/json", limit: "1mb" }),
    cashfreeWebhook
);


app.use(express.json());
app.use(express.static('public'));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.use(express.urlencoded({extended:true}));


//routes

app.use('/users',userRoutes);
app.use('/expense',expenseRoutes);
app.use('/purchase', purchaseRoutes);
app.use("/premium", premiumRoutes);
app.use("/password", passwordRoutes);
app.use("/expense", reportsRoutes);
app.use("/budget", budgetRoutes);
app.use("/payments", paymentRoutes);
app.use("/payments/demo", demoPaymentRoutes);
app.use("/notifications", notificationRoutes);

// central error handler - must be registered after all routes
app.use(errorHandler);

// connect to MongoDB and start server

connectDB().then(() => {
    console.log("Database connected");

    app.listen(PORT, () => {
        console.log("Server is running.");
    });
})
.catch((err)=>{
    console.log(err);
});


