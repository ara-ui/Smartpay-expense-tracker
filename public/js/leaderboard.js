requireAuth();

if (!isPremium()) {
    window.location.href = "premium-required.html";
} else {
    document.body.style.visibility = "visible";
}

const LEADERBOARD_MEDALS = ["🥇", "🥈", "🥉"];
let selectedPeriod = "weekly";

const formatMoney = (paise) =>
    `₹${(Number(paise || 0) / 100).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

function getLeaderboardInitials(name) {
    return (name || "")
        .split(" ")
        .filter(Boolean)
        .map(word => word[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function loadLeaderboard(period = selectedPeriod) {
    selectedPeriod = period;
    const message = document.getElementById("leaderboardMessage");
    message.textContent = "Loading savings leaderboard...";

    try {
        const response = await axios.get(
            `${BASE_URL}/premium/leaderboard?period=${encodeURIComponent(period)}`,
            { headers: { Authorization: localStorage.getItem("token") } }
        );

        const leaderboardData = response.data?.leaderboard || [];
        const currentUser = getCurrentUser();
        const currentUserId = currentUser?.id ? String(currentUser.id) : null;

        document.getElementById("periodTitle").textContent =
            `${period === "weekly" ? "Weekly" : "Monthly"} savings`;

        renderChampion(leaderboardData[0], period, currentUserId);
        renderLeaderboardPodium(leaderboardData, currentUserId);
        renderLeaderboardList(leaderboardData, currentUserId);

        message.textContent = leaderboardData.length
            ? `${leaderboardData.length} user${leaderboardData.length === 1 ? "" : "s"} with a ${period} budget are ranked by savings.`
            : `No ${period} budget has been configured by any user yet.`;
    } catch (err) {
        console.error("Savings leaderboard load failed:", err);
        document.getElementById("leaderboardPodium").innerHTML = "";
        document.getElementById("leaderboardList").innerHTML = "";
        document.getElementById("championCard").hidden = true;
        message.textContent = err.response?.data?.message || "Unable to load savings leaderboard.";
    }
}

function renderChampion(champion, period, currentUserId) {
    const card = document.getElementById("championCard");
    if (!champion) {
        card.hidden = true;
        card.innerHTML = "";
        return;
    }

    const isYou = currentUserId && String(champion.userId) === currentUserId;
    card.hidden = false;
    card.innerHTML = `
        <div class="champion-icon">🏆</div>
        <div>
            <p class="champion-label">${period === "weekly" ? "WEEKLY" : "MONTHLY"} SAVINGS CHAMPION</p>
            <h2>${escapeHtml(champion.name)}${isYou ? " <span>You</span>" : ""}</h2>
            <p>Saved <strong>${formatMoney(champion.savingsPaise)}</strong> from a ${formatMoney(champion.limitPaise)} ${period} limit.</p>
        </div>
    `;
}

function renderLeaderboardPodium(data, currentUserId) {
    const podium = document.getElementById("leaderboardPodium");
    const topThree = data.slice(0, 3);

    podium.innerHTML = topThree.map((user, index) => {
        const isYou = currentUserId && String(user.userId) === currentUserId;
        return `
            <div class="podium-card podium-rank-${index + 1}${isYou ? " podium-you" : ""}">
                <div class="podium-medal">${LEADERBOARD_MEDALS[index]}</div>
                <div class="podium-avatar">${getLeaderboardInitials(user.name)}</div>
                <div class="podium-name">${escapeHtml(user.name)}${isYou ? " (You)" : ""}</div>
                <div class="podium-amount">${formatMoney(user.savingsPaise)}</div>
                <small>saved</small>
            </div>
        `;
    }).join("");
}

function renderLeaderboardList(data, currentUserId) {
    const leaderboard = document.getElementById("leaderboardList");
    leaderboard.innerHTML = "";

    data.forEach((user, index) => {
        const rank = index + 1;
        const medal = LEADERBOARD_MEDALS[index];
        const isYou = currentUserId && String(user.userId) === currentUserId;
        const li = document.createElement("li");

        li.className = "leaderboard-row" + (isYou ? " leaderboard-row-you" : "");
        li.innerHTML = `
            <span class="lb-rank">${medal || rank}</span>
            <span class="lb-user">
                <span class="lb-avatar">${getLeaderboardInitials(user.name)}</span>
                <span class="lb-name">${escapeHtml(user.name)}${isYou ? ' <span class="lb-you-badge">You</span>' : ""}</span>
            </span>
            <span class="lb-amount">
                ${formatMoney(user.savingsPaise)}
                <small>saved</small>
            </span>
        `;

        leaderboard.appendChild(li);
    });
}

window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".period-button").forEach((button) => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".period-button").forEach((item) => item.classList.remove("active"));
            button.classList.add("active");
            loadLeaderboard(button.dataset.period);
        });
    });

    loadLeaderboard();
});
