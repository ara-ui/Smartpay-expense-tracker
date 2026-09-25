function getLoggedInUserName() {
    const token = localStorage.getItem("token");
    if (!token || typeof jwt_decode !== "function") {
        return "User";
    }

    try {
        const user = jwt_decode(token);
        return user?.name || user?.username || "User";
    } catch {
        return "User";
    }
}

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
        const response = await api.get("/budget/insights", { timeout: 20000 });
        const insight = response.data?.insight || response.data?.insights?.[0];

        const userName = getLoggedInUserName();
        const greetingEl = document.getElementById("dashboardGreeting");

        if (greetingEl) {
            greetingEl.textContent = `Welcome back, ${userName}`;
        }

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
