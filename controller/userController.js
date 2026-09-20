const User = require('../model/User');
const Expense = require("../model/Expense");
const Order = require("../model/Order");
const bcrypt = require("bcrypt");
const { generateAccessToken } = require("../utils/jwt");
const { getPeriodBounds } = require("../services/budgetService");
const { ensurePaymentId } = require("../services/demoPaymentService");


//createuser


const createUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required",
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
            name,
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
        });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        }

            const result = await bcrypt.compare(password, user.password);

            if (!result) {

                return res.status(401).json({
                    success: false,
                    message: "User not authorized"
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

//income part starts here

const updatedincome=async(req,res)=>{
    try{
        const{monthlyIncome}=req.body;

        req.user.monthlyIncome=monthlyIncome;
        await req.user.save();

        res.status(200).json({
            success:true,
            monthlyIncome:req.user.monthlyIncome
        });
    }
    catch(err){
        console.log(err);
        res.status(500).json({
            success:false,
            message:"Something went wrong"
        });
    }
}


//get income

const getincome=async (req,res)=>{
    try{
        res.status(200).json({
            success:true,
            monthlyIncome:req.user.monthlyIncome
        });
    }
    catch(err){
        console.log(err);
        res.status(500).json({
            success:false,
            message:"Something went wrong"
        });
    }
}

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
            status: "SUCCESSFUL"
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


const downloadExpenses = async (req, res) => {

    try {


        const expenses = await Expense.find({
            userId: req.user._id
        });

        const data = JSON.stringify(expenses, null, 2);
        const filename = `expenses-${req.user._id}-${Date.now()}.json`;

        // Served directly from the app - no external storage involved.
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.status(200).send(data);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });

    }

};
module.exports = { createUser, loginUser,updatedincome ,getincome,downloadExpenses,getQuickStats,getMembership};