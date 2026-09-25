const { GoogleGenAI } = require("@google/genai");

const ai = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;

const MODEL = process.env.GEMINI_INSIGHT_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-flash";

function cleanText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .replace(/^['\"]|['\"]$/g, "")
        .trim();
}

async function generateSpendingInsight(facts) {
    if (!ai) return null;

    const prompt = [
        "You are SmartPay's personal finance dashboard coach.",
        "Write ONE short, encouraging spending insight for the user.",
        "Use ONLY the supplied facts. Never invent amounts, categories, dates, trends, or goals.",
        "Do not give investment, lending, tax, or financial-product advice.",
        "Keep it friendly and practical, 18-30 words maximum.",
        "Do not use emojis. Do not use markdown. Return only the sentence.",
        "Facts:",
        JSON.stringify(facts)
    ].join("\n");

    try {
        const response = await ai.models.generateContent({
            model: MODEL,
            contents: prompt
        });
        const message = cleanText(response.text);
        if (!message || message.length > 220) return null;
        return message;
    } catch (error) {
        console.warn("AI spending insight unavailable; using deterministic insight:", error.message);
        return null;
    }
}

module.exports = { generateSpendingInsight };
