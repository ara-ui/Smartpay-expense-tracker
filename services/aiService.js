const { GoogleGenAI } = require('@google/genai');

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const CATEGORIES = new Set(["Food","Travel","Shopping","Entertainment","Bills","Health","Education","Salary","Investment","Other"]);
const rules = [
  [/(uber|ola|cab|taxi|metro|bus|train|flight|airline|auto|rickshaw|rapido)/i, "Travel"],
  [/(food|tea|coffee|chai|lunch|dinner|breakfast|snack|pizza|burger|restaurant|swiggy|zomato|dominos|kfc|mcdonald)/i, "Food"],
  [/(amazon|myntra|flipkart|shopping|clothes|shirt|shoes|purchase)/i, "Shopping"],
  [/(netflix|movie|cinema|spotify|music|game|gaming|entertainment)/i, "Entertainment"],
  [/(electricity|water bill|rent|internet|wifi|mobile recharge|phone bill|utility)/i, "Bills"],
  [/(doctor|hospital|medicine|medical|pharmacy|health)/i, "Health"],
  [/(course|book|tuition|college|school|education)/i, "Education"],
  [/(salary|paycheck|income)/i, "Salary"],
  [/(investment|mutual fund|stocks|sip)/i, "Investment"]
];

function getLocalCategory(description) {
  const text = String(description || '').trim();
  const local = getLocalCategory(text);
  if (local) return local;
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
