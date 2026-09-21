const mongoose = require('mongoose');
const Expense=require('../model/Expense');
const User = require('../model/User');
const aiService = require("../services/aiService");
const {
    BudgetExceededError,
    amountToPaise,
    enforceExpenseBudget,
    reverseExpenseBudget,
    notifyBudgetThresholds
} = require("../services/budgetService");


const addExpense = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { amount, description } = req.body;
        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be a valid number greater than 0"
            });
        }

        if (!description || typeof description !== "string" || !description.trim()) {
            return res.status(400).json({
                success: false,
                message: "Description is required"
            });
        }

        try {
            amountToPaise(numericAmount);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        // Get category from AI. The fallback remains Other so an AI outage
        // does not prevent a legitimate manual expense from being recorded.
        let category = "Other";
        try {
            category = await aiService.getCategory(description.trim());
        } catch (err) {
            console.log("AI Error:", err.message);
        }

        const { CATEGORIES } = require("../utils/categories");
        if (!CATEGORIES.includes(category)) category = "Other";

        let expense;
        let budgetChecks = [];
        try {
            await session.withTransaction(async () => {
                    const budgetResult = await enforceExpenseBudget({
                    userId: req.user._id,
                    amount: numericAmount,
                    category,
                    session
                });
                budgetChecks = budgetResult.checks;

                const created = await Expense.create(
                    [{
                        amount: numericAmount,
                        description: description.trim(),
                        category,
                        userId: req.user._id
                    }],
                    { session }
                );

                expense = created[0];

                await User.updateOne(
                    { _id: req.user._id },
                    { $inc: { totalExpense: numericAmount } },
                    { session }
                );
            });
        } catch (err) {
            if (err instanceof BudgetExceededError) {
                return res.status(409).json({
                    success: false,
                    code: err.code,
                    message: "Expense would exceed your budget limit",
                    budget: err.details
                });
            }
            throw err;
        }


        notifyBudgetThresholds(req.user._id, budgetChecks).catch((err) => {
            console.log("Budget notification failed:", err.message);
        });

        res.status(201).json({
            success: true,
            message: "Expense Added",
            expense
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    } finally {
        await session.endSession();
    }
};

//get expenses

const getExpenses=async(req,res)=>{
    try{
        //pagination

        const page = Math.max(Number(req.query.page) || 1, 1);
        const ITEMS_PER_PAGE = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
        const offset=(page -1) *ITEMS_PER_PAGE;

        const [totalExpenses, expenses] = await Promise.all([
            Expense.countDocuments({ userId: req.user._id }),
            Expense.find({ userId: req.user._id })
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(ITEMS_PER_PAGE)
                .lean()
        ]);

        res.status(200).json({
            success:true,
            expenses,
            totalExpenses,
            currentPage:page,
            hasNextPage:ITEMS_PER_PAGE*page < totalExpenses,
            nextPage:page+1,
            hasPreviousPage:page >1,
            previousPage:page-1,
            lastPage:Math.ceil(totalExpenses/ITEMS_PER_PAGE)
        });
        
    }
    catch(err){
        console.log(err);
        res.status(500).json({
            success:false,
            message:"Something went wrong"
        });
    }
};

//delete expenses
const deleteExpense = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        let expense;
        await session.withTransaction(async () => {
            expense = await Expense.findOne({
                _id: req.params.id,
                userId: req.user._id
            }).session(session);

            if (!expense) return;

            await Expense.deleteOne({
                _id: expense._id,
                userId: req.user._id
            }).session(session);

            await reverseExpenseBudget({
                userId: req.user._id,
                amount: expense.amount,
                category: expense.category,
                createdAt: expense.createdAt,
                session
            });

            await User.updateOne(
                { _id: req.user._id },
                { $inc: { totalExpense: -Number(expense.amount) } },
                { session }
            );
        });

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Expense deleted"
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    } finally {
        await session.endSession();
    }
};

module.exports={
    addExpense,
    getExpenses,
    deleteExpense
}