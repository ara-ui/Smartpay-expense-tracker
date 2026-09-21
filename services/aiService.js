const { GoogleGenAI } = require('@google/genai');

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const CATEGORIES = new Set(["Food","Travel","Shopping","Entertainment","Bills","Health","Education","Salary","Investment","Other"]);
const rules = [
  [/\b(uber|ola|cab|taxi|metro|bus|train|flight|airline|auto|rickshaw|rapido|fuel|petrol|diesel)\b/i, "Travel"],
  [/\b(food|tea|coffee|chai|lunch|dinner|breakfast|snack|pizza|burger|restaurant|swiggy|zomato|dominos|kfc|mcdonald)\b/i, "Food"],
  [/\b(amazon|myntra|flipkart|shopping|clothes|shirt|shoes|purchase)\b/i, "Shopping"],
  [/\b(netflix|movie|cinema|spotify|music|game|gaming|entertainment)\b/i, "Entertainment"],
  [/\b(electricity|water bill|broadband|rent|internet|wifi|recharge|phone bill|utility)\b/i, "Bills"],
  [/\b(doctor|hospital|medicine|medical|pharmacy|health)\b/i, "Health"],
  [/\b(course|book|tuition|college|school|education)\b/i, "Education"],
  [/\b(salary|paycheck|income)\b/i, "Salary"],
  [/\b(investment|mutual fund|stocks|sip)\b/i, "Investment"]
];

function getLocalCategory(description) {
  const text = String(description || '').trim();
  if (!text) return null;
  for (const [pattern, category] of rules) if (pattern.test(text)) return category;
  return null;
}

async function getCategory(description) {
  const text = String(description || '').trim();
  if (!text) return 'Other';
  for (const [pattern, category] of rules) if (pattern.test(text)) return category;
  if (!ai) return 'Other';
  try {
    const prompt = `Classify this expense into exactly one category: Food, Travel, Shopping, Entertainment, Bills, Health, Education, Salary, Investment, Other. Reply with only the category. Expense: "${text}"`;
    const response = await ai.models.generateContent({ model: 'gemini-3.5-flash', contents: prompt });
    const result = String(response.text || '').trim().replace(/[^A-Za-z]/g, '');
    const match = [...CATEGORIES].find(c => c.toLowerCase() === result.toLowerCase());
    return match || 'Other';
  } catch (error) {
    console.warn('AI categorization unavailable; using Other:', error.message);
    return 'Other';
  }
}
module.exports = { getCategory, getLocalCategory };
