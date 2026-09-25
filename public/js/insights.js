// Daily Insight widget. The server computes the user's real spending facts.
// When GEMINI_API_KEY is configured, the server can turn those facts into a
// concise AI-written coaching message. A deterministic fallback is returned
// when AI is unavailable.

const escapeInsightHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function loadDailyInsights() {
    const card = document.getElementById("dailyInsightCard");
    const messageEl = document.getElementById("dailyInsightMessage");
    if (!card || !messageEl) return;

    if (typeof isPremium === "function" && !isPremium()) {
        card.hidden = true;
        return;
    }

    try {
        const response = await api.get("/budget/insights", { timeout: 8000 });
        const insight = response.data?.insight || response.data?.insights?.[0];
        if (!insight?.message) {
            card.hidden = true;
            return;
        }

        const tone = insight.tone || "neutral";
        messageEl.textContent = insight.message;
        messageEl.dataset.tone = tone;

        card.hidden = false;
    } catch (err) {
        card.hidden = true;
    }
}

document.addEventListener("DOMContentLoaded", loadDailyInsights);
