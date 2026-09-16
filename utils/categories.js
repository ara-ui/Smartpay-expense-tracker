// Canonical expense categories. Mirrors the list in services/aiService.js's
// AI-classifier prompt so budget-rule category validation can't drift out
// of sync with what expenses actually get categorized as. If the AI
// prompt's category list ever changes, update this array too.
const CATEGORIES = [
    "Food",
    "Travel",
    "Shopping",
    "Entertainment",
    "Bills",
    "Health",
    "Education",
    "Salary",
    "Investment",
    "Other"
];

module.exports = { CATEGORIES };
