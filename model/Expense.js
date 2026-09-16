const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true
    },

    description: {
      type: String,
      required: true
    },

    category: {
      type: String,
      required: true
    },

    note: {
      type: String,
      default: null
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

// Budget-period and category queries use these indexes when rebuilding or
// reconciling BudgetUsage from existing expenses.
expenseSchema.index({ userId: 1, createdAt: 1 });
expenseSchema.index({ userId: 1, category: 1, createdAt: 1 });

module.exports = mongoose.model("Expense", expenseSchema);