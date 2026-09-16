// Daily Insight widget. Renders 1-3 short, positive, data-backed insights
// on the dashboard. Silently hides itself for non-premium users or when
// there isn't enough data yet, rather than showing an error.

const escapeInsightHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function loadDailyInsights() {
    const card = document.getElementById("dailyInsightCard");
    const list = document.getElementById("insightList");
    if (!card || !list) return;

    if (typeof isPremium === "function" && !isPremium()) {
        card.hidden = true;
        return;
    }

    try {
        const response = await api.get("/budget/insights", { timeout: 8000 });
        const insights = response.data?.insights || [];
        if (!insights.length) {
            card.hidden = true;
            return;
        }
        list.innerHTML = insights.map((insight) =>
            `<li class="insight-item insight-${escapeInsightHtml(insight.tone || "neutral")}">${escapeInsightHtml(insight.message)}</li>`
        ).join("");
        card.hidden = false;
    } catch (err) {
        // Insights are a nice-to-have on the dashboard; never block or
        // error out the rest of the page if they fail to load.
        card.hidden = true;
    }
}

document.addEventListener("DOMContentLoaded", loadDailyInsights);
