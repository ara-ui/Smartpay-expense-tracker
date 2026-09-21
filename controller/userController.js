const User = require('../model/User');
const Expense = require("../model/Expense");
const Order = require("../model/Order");
const bcrypt = require("bcrypt");
const { generateAccessToken } = require("../utils/jwt");
const { getPeriodBounds } = require("../services/budgetService");
const { ensurePaymentId } = require("../services/demoPaymentService");

const DUMMY_PASSWORD_HASH = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";


//createuser


const createUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedName || normalizedName.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Name must be between 1 and 100 characters"
            });
        }

        if (password.length < 5) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 5 characters"
            });
        }
        const emailPattern = /^\S+@\S+\.\S+$/;

        if (!emailPattern.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {

            return res.status(409).json({
                success: false,
                message: "User already exists"
            });

        }

        // HASH PASSWORD to store while creating a user
        const hash = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: normalizedName,
            email: normalizedEmail,
            password: hash
        });

        // Every new user receives a unique SmartPay Payment ID immediately.
        // This is an internal demo identifier, not a real UPI ID.
        await ensurePaymentId(user);

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            token: generateAccessToken(
                user._id,
                user.name,
                user.email,
                user.isPremiumUser
            ),
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isPremiumUser: user.isPremiumUser
            }
        });

    }
    catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "Something went wrong",

        });
    }
}


const loginUser = async (req, res) => {

    try {
       
       
        const { email, password } = req.body;
         if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        const emailPattern = /^\S+@\S+\.\S+$/;

        if (!emailPattern.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        const user = await User.findOne({
            email: normalizedEmail
        }).select("+password");

        const passwordHash = user?.password || DUMMY_PASSWORD_HASH;
        const result = await bcrypt.compare(password, passwordHash);

        if (!user || !result) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

            // Password matched
            return res.status(200).json({

                success: true,

                message: "Login Successful",

                token: generateAccessToken(

                    user._id,

                    user.name,

                    user.email,

                    user.isPremiumUser

                )

            });

    }

    catch (err) {

        console.log(err);

        return res.status(500).json({

            success: false,

            message: "Something went wrong"

        });

    }

};

//quick statistics

const getQuickStats = async (req, res) => {
    try {
        const now = new Date();
        const monthBounds = getPeriodBounds("monthly", now);
        const dayBounds = getPeriodBounds("daily", now);

        const [monthRow, todayRow, topCategoryRow] = await Promise.all([
            Expense.aggregate([
                {
                    $match: {
                        userId: req.user._id,
                        createdAt: {
                            $gte: monthBounds.start,
                            $lt: monthBounds.end
                        }
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            Expense.aggregate([
                {
                    $match: {
                        userId: req.user._id,
                        createdAt: {
                            $gte: dayBounds.start,
                            $lt: dayBounds.end
                        }
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            Expense.aggregate([
                { $match: { userId: req.user._id } },
                { $group: { _id: "$category", categoryTotal: { $sum: "$amount" } } },
                { $sort: { categoryTotal: -1 } },
                { $limit: 1 }
            ])
        ]);

        res.status(200).json({
            success: true,
            totalExpenses: Number(req.user.totalExpense) || 0,
            thisMonthExpenses: Number(monthRow[0]?.total || 0),
            todayExpenses: Number(todayRow[0]?.total || 0),
            highestCategory: topCategoryRow[0]?._id || null
        });
    } catch (err) {
        console.error("Get quick stats failed:", err);
        res.status(500).json({
            success: false,
            message: "Unable to load quick statistics"
        });
    }
};


//membership
 
const getMembership = async (req, res) => {
    try {

        const lastOrder = await Order.findOne({
            userId: req.user._id,
            status: "SUCCESSFUL",
            purpose: "PREMIUM_MEMBERSHIP"
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            currentPlan: req.user.isPremiumUser ? "Premium" : "Free",
            membershipStatus: req.user.isPremiumUser ? "Active" : "Free",
            purchaseDate: lastOrder ? lastOrder.createdAt : null,
            lastPaymentDate: lastOrder ? lastOrder.updatedAt : null,
            expiryDate: null,
            remainingDays: null,
            paymentMethod: null
        });

    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};


module.exports = { createUser, loginUser, getQuickStats, getMembership };