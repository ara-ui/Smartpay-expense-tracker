const { Expense } = require("../model");

const getReport = async (req, res) => {
    try {
        const {
            type,
            date,
            startDate: customStartDate,
            endDate: customEndDate
        } = req.query;

        let startDate;
        let endDate;

        if (customStartDate && customEndDate) {


            startDate = new Date(customStartDate);
            endDate = new Date(customEndDate);

            endDate.setDate(endDate.getDate() + 1);

        } else {

            switch (type) {

                case "daily":
                    startDate = new Date(date);
                    endDate = new Date(date);

                    endDate.setDate(endDate.getDate() + 1);
                    break;

                case "weekly":
                    startDate = new Date(date);
                    endDate = new Date(date);

                    endDate.setDate(endDate.getDate() + 7);
                    break;

                case "monthly":
                    startDate = new Date(date);
                    endDate = new Date(startDate);

                    endDate.setMonth(endDate.getMonth() + 1);
                    break;

                case "yearly":
                    startDate = new Date(date);
                    endDate = new Date(startDate);

                    endDate.setFullYear(
                        endDate.getFullYear() + 1
                    );
                    break;

                default:
                    return res.status(400).json({
                        success: false,
                        message: "Invalid report type"
                    });
            }
        }

        // Mongoose query
        const expenses = await Expense.find({
            userId: req.user._id,
            createdAt: {
                $gte: startDate,
                $lt: endDate
            }
        }).sort({
            createdAt: -1
        });

        const totalExpense = expenses.reduce((sum, expense) => {
            return sum + Number(expense.amount);
        }, 0);

        res.status(200).json({
            success: true,
            expenses,
            totalExpense
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });

    }
};

module.exports = {
    getReport
};