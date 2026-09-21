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

const PERIODS = ["daily", "weekly", "monthly"];

const formatRupees = (paise) => {
    const rupees = Number(paise || 0) / 100;
    return `₹${rupees.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
};

const rupeesToPaise = (value) => {
    const amount = Number(value);

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter a positive budget amount.");
    }

    const paise = Math.round(amount * 100);

    if (
        !Number.isSafeInteger(paise) ||
        Math.abs(amount * 100 - paise) > 1e-8
    ) {
        throw new Error("Budget amount can have at most two decimal places.");
    }

    return paise;
};

const setMessage = (element, message = "", type = "") => {
    element.textContent = message;
    element.className = `form-message${type ? ` ${type}` : ""}`;
};

const setButtonBusy = (button, busy, busyText, normalText) => {
    button.disabled = busy;
    button.textContent = busy ? busyText : normalText;
};

let budgetRules = null;
let budgetStatus = null;
let budgetReauthToken = sessionStorage.getItem("budgetReauthToken");
let overallEditMode = false;

document.addEventListener("DOMContentLoaded", async () => {
    const user = requireAuth();
    if (!user) return;

    populateCategorySelect();
    bindEvents();
    await loadBudgetPage();
});

function populateCategorySelect() {
    const select = document.getElementById("categoryInput");

    CATEGORIES.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
}

function bindEvents() {
    document
        .getElementById("overallBudgetForm")
        .addEventListener("submit", saveOverallLimits);

    document
        .getElementById("clearOverallLimitsBtn")
        .addEventListener("click", clearOverallLimits);

    document
        .getElementById("categoryBudgetForm")
        .addEventListener("submit", saveCategoryLimit);

    document
        .getElementById("editOverallLimitsBtn")
        .addEventListener("click", toggleOverallEditMode);
}

async function loadBudgetPage() {
    try {
        const [rulesResponse, statusResponse] = await Promise.all([
            api.get("/budget/rules"),
            api.get("/budget/status")
        ]);

        budgetRules = rulesResponse.data.budgetRules;
        budgetStatus = statusResponse.data.usage;

        renderOverallInputs();
        renderOverview();
        renderPeriodStatus();
        renderCategoryLimits();
    } catch (error) {
        console.error("Unable to load budget page:", error);

        document.getElementById("periodStatusGrid").innerHTML =
            `<div class="empty-state">Unable to load budget information. Please try again.</div>`;

        setMessage(
            document.getElementById("overallBudgetMessage"),
            error.response?.data?.message || "Unable to load budget information.",
            "error"
        );
    }
}

function renderOverallInputs() {
    const values = {
        dailyLimitInput: budgetRules?.dailyLimitPaise,
        weeklyLimitInput: budgetRules?.weeklyLimitPaise,
        monthlyLimitInput: budgetRules?.monthlyLimitPaise
    };

    Object.entries(values).forEach(([id, paise]) => {
        const input = document.getElementById(id);
        input.value =
            paise === null || paise === undefined
                ? ""
                : Number(paise) / 100;
        input.disabled = !overallEditMode;
    });
}

function setOverallEditMode(editing) {
    overallEditMode = editing;

    ["dailyLimitInput", "weeklyLimitInput", "monthlyLimitInput"].forEach((id) => {
        document.getElementById(id).disabled = !editing;
    });

    const editButton = document.getElementById("editOverallLimitsBtn");
    const saveButton = document.getElementById("saveOverallLimitsBtn");
    const clearButton = document.getElementById("clearOverallLimitsBtn");

    editButton.textContent = editing ? "Cancel edit" : "Edit limits";
    editButton.classList.toggle("editing", editing);
    saveButton.hidden = !editing;
    clearButton.hidden = !editing;
}

function hasValidBudgetReauthToken() {
    if (!budgetReauthToken) return false;

    try {
        const decoded = jwt_decode(budgetReauthToken);
        return Boolean(decoded?.exp && Date.now() < decoded.exp * 1000);
    } catch {
        return false;
    }
}

async function ensureBudgetReauth({ force = false } = {}) {
    if (!force && hasValidBudgetReauthToken()) return true;

    budgetReauthToken = null;
    sessionStorage.removeItem("budgetReauthToken");

    const modal = document.getElementById("budgetPasswordModal");
    const form = document.getElementById("budgetPasswordForm");
    const input = document.getElementById("budgetPasswordInput");
    const message = document.getElementById("budgetPasswordMessage");
    const close = document.getElementById("budgetPasswordClose");

    modal.hidden = false;
    input.value = "";
    message.textContent = "";
    input.focus();

    return new Promise((resolve) => {
        const cleanup = () => {
            form.removeEventListener("submit", submit);
            close.removeEventListener("click", cancel);
        };

        const cancel = () => {
            cleanup();
            modal.hidden = true;
            resolve(false);
        };

        const submit = async (event) => {
            event.preventDefault();

            const password = input.value;
            if (!password) {
                message.textContent = "Password is required.";
                message.className = "form-message error";
                return;
            }

            const button = form.querySelector("button[type='submit']");
            button.disabled = true;
            button.textContent = "Verifying...";

            try {
                const response = await api.post("/budget/verify-password", { password });
                budgetReauthToken = response.data.budgetReauthToken;
                sessionStorage.setItem("budgetReauthToken", budgetReauthToken);
                cleanup();
                modal.hidden = true;
                resolve(true);
            } catch (error) {
                message.textContent =
                    error.response?.data?.message || "Incorrect password.";
                message.className = "form-message error";
            } finally {
                button.disabled = false;
                button.textContent = "Verify & continue";
            }
        };

        form.addEventListener("submit", submit);
        close.addEventListener("click", cancel);
    });
}

function budgetMutationConfig() {
    return {
        headers: {
            "X-Budget-Reauth-Token": budgetReauthToken
        }
    };
}

async function toggleOverallEditMode() {
    if (overallEditMode) {
        setOverallEditMode(false);
        renderOverallInputs();
        return;
    }

    if (!(await ensureBudgetReauth({ force: true }))) return;
    setOverallEditMode(true);
    renderOverallInputs();
}

function getStatusEntry(period, category = null) {
    return budgetStatus?.[period]?.find(
        (item) => item.category === category
    );
}

function renderOverview() {
    const monthlyRule = getStatusEntry("monthly", null);
    const limitEl = document.getElementById("monthlyLimitValue");
    const spentEl = document.getElementById("monthlySpentValue");
    const remainingEl = document.getElementById("monthlyRemainingValue");
    const bar = document.getElementById("monthlyProgressBar");
    const progressText = document.getElementById("monthlyProgressText");
    const percentText = document.getElementById("monthlyPercentText");
    const badge = document.getElementById("budgetHealthBadge");

    spentEl.textContent = monthlyRule
        ? formatRupees(monthlyRule.spentPaise)
        : "₹0.00";

    if (!monthlyRule) {
        limitEl.textContent = "Not set";
        remainingEl.textContent = "—";
        bar.style.width = "0%";
        bar.className = "budget-progress-bar";
        progressText.textContent = "Set a monthly limit to start tracking.";
        percentText.textContent = "";
        badge.textContent = "Not configured";
        badge.className = "budget-badge";
        return;
    }

    const limit = Number(monthlyRule.limitPaise);
    const spent = Number(monthlyRule.spentPaise);
    const percent = limit > 0 ? (spent / limit) * 100 : 0;
    const clampedPercent = Math.min(100, Math.max(0, percent));

    limitEl.textContent = formatRupees(limit);
    remainingEl.textContent =
        spent > limit
            ? "₹0.00"
            : formatRupees(limit - spent);

    bar.style.width = `${clampedPercent}%`;

    if (spent > limit) {
        bar.className = "budget-progress-bar exceeded";
        badge.textContent = "Budget exceeded";
        badge.className = "budget-badge exceeded";
        progressText.textContent = `${formatRupees(spent - limit)} over the monthly limit.`;
    } else if (percent >= 80) {
        bar.className = "budget-progress-bar warning";
        badge.textContent = "Near limit";
        badge.className = "budget-badge warning";
        progressText.textContent = `${formatRupees(limit - spent)} remaining this month.`;
    } else {
        bar.className = "budget-progress-bar";
        badge.textContent = "On track";
        badge.className = "budget-badge good";
        progressText.textContent = `${formatRupees(limit - spent)} remaining this month.`;
    }

    percentText.textContent = `${percent.toFixed(1)}% used`;
}

function renderPeriodStatus() {
    const grid = document.getElementById("periodStatusGrid");

    grid.innerHTML = PERIODS.map((period) => {
        const entry = getStatusEntry(period, null);

        if (!entry) {
            return `
                <article class="status-card">
                    <h3>${capitalize(period)}</h3>
                    <p class="category-period">No overall limit configured.</p>
                </article>
            `;
        }

        const limit = Number(entry.limitPaise);
        const spent = Number(entry.spentPaise);
        const percent = limit > 0 ? (spent / limit) * 100 : 0;
        const width = Math.min(100, Math.max(0, percent));
        const state =
            spent > limit
                ? "exceeded"
                : percent >= 80
                    ? "warning"
                    : "";

        return `
            <article class="status-card">
                <h3>${capitalize(period)}</h3>
                <div class="status-values">
                    <strong>${formatRupees(spent)}</strong>
                    <span>of ${formatRupees(limit)}</span>
                </div>
                <div class="status-bar">
                    <div class="status-bar-fill ${state}" style="width:${width}%;"></div>
                </div>
                <p class="category-period">
                    ${spent > limit
                        ? `${formatRupees(spent - limit)} over limit`
                        : `${formatRupees(limit - spent)} remaining`}
                </p>
            </article>
        `;
    }).join("");
}

function renderCategoryLimits() {
    const list = document.getElementById("categoryLimitsList");
    const limits = budgetRules?.categoryLimits || [];

    if (limits.length === 0) {
        list.innerHTML =
            `<div class="empty-state">No category limits configured yet.</div>`;
        return;
    }

    list.innerHTML = limits
        .slice()
        .sort((a, b) =>
            a.category.localeCompare(b.category) ||
            PERIODS.indexOf(a.period) - PERIODS.indexOf(b.period)
        )
        .map((limit) => {
            const usage = getStatusEntry(limit.period, limit.category);
            const spent = usage?.spentPaise || 0;
            const limitPaise = Number(limit.limitPaise);
            const percent =
                limitPaise > 0 ? (spent / limitPaise) * 100 : 0;
            const state =
                spent > limitPaise
                    ? "exceeded"
                    : percent >= 80
                        ? "warning"
                        : "";

            return `
                <article class="category-row">
                    <div class="category-name">${escapeHtml(limit.category)}</div>
                    <div class="category-period">${capitalize(limit.period)}</div>
                    <div class="category-limit">
                        ${formatRupees(spent)} / ${formatRupees(limitPaise)}
                    </div>
                    <button
                        type="button"
                        class="danger-btn"
                        data-category="${escapeHtml(limit.category)}"
                        data-period="${escapeHtml(limit.period)}"
                    >
                        Remove
                    </button>
                    <div class="status-bar">
                        <div class="status-bar-fill ${state}" style="width:${Math.min(100, Math.max(0, percent))}%;"></div>
                    </div>
                    <div class="category-period">
                        ${spent > limitPaise
                            ? `${formatRupees(spent - limitPaise)} over limit`
                            : `${formatRupees(limitPaise - spent)} remaining`}
                    </div>
                </article>
            `;
        })
        .join("");

    list.querySelectorAll(".danger-btn").forEach((button) => {
        button.addEventListener("click", () => {
            removeCategoryLimit(button.dataset.category, button.dataset.period);
        });
    });
}

async function saveOverallLimits(event) {
    event.preventDefault();

    const messageEl = document.getElementById("overallBudgetMessage");
    const button = document.getElementById("saveOverallLimitsBtn");

    try {
        if (!(await ensureBudgetReauth())) return;

        const payload = {};

        [
            ["dailyLimitPaise", "dailyLimitInput"],
            ["weeklyLimitPaise", "weeklyLimitInput"],
            ["monthlyLimitPaise", "monthlyLimitInput"]
        ].forEach(([field, inputId]) => {
            const input = document.getElementById(inputId);

            if (!input.value.trim()) {
                payload[field] = null;
                return;
            }

            payload[field] = rupeesToPaise(input.value);
        });

        setButtonBusy(button, true, "Saving...", "Save limits");

        const response = await api.put("/budget/rules", payload, budgetMutationConfig());
        budgetRules = response.data.budgetRules;

        await refreshStatus();
        setOverallEditMode(false);
        setMessage(messageEl, "Budget limits saved.", "success");
    } catch (error) {
        console.error("Saving overall limits failed:", error);
        setMessage(
            messageEl,
            error.response?.data?.message || error.message || "Unable to save limits.",
            "error"
        );
    } finally {
        setButtonBusy(button, false, "Saving...", "Save limits");
    }
}

async function clearOverallLimits() {
    const confirmed = window.confirm(
        "Clear daily, weekly, and monthly overall limits?"
    );

    if (!confirmed) return;

    const messageEl = document.getElementById("overallBudgetMessage");
    const button = document.getElementById("clearOverallLimitsBtn");

    try {
        if (!(await ensureBudgetReauth())) return;

        setButtonBusy(button, true, "Clearing...", "Clear all");

        const response = await api.put("/budget/rules", {
            dailyLimitPaise: null,
            weeklyLimitPaise: null,
            monthlyLimitPaise: null
        }, budgetMutationConfig());

        budgetRules = response.data.budgetRules;
        await refreshStatus();
        setOverallEditMode(false);

        setMessage(messageEl, "Overall limits cleared.", "success");
    } catch (error) {
        console.error("Clearing limits failed:", error);
        setMessage(
            messageEl,
            error.response?.data?.message || "Unable to clear limits.",
            "error"
        );
    } finally {
        setButtonBusy(button, false, "Clearing...", "Clear all");
    }
}

async function saveCategoryLimit(event) {
    event.preventDefault();

    const messageEl = document.getElementById("categoryBudgetMessage");
    const button = document.getElementById("saveCategoryLimitBtn");

    try {
        const category = document.getElementById("categoryInput").value;
        const period = document.getElementById("categoryPeriodInput").value;
        const limitPaise = rupeesToPaise(
            document.getElementById("categoryLimitInput").value
        );

        setButtonBusy(button, true, "Saving...", "Add / Update limit");

        if (!(await ensureBudgetReauth({ force: true }))) return;

        const response = await api.post("/budget/rules/category", {
            category,
            period,
            limitPaise
        }, budgetMutationConfig());

        budgetRules = response.data.budgetRules;
        await refreshStatus();

        document.getElementById("categoryLimitInput").value = "";
        setMessage(messageEl, "Category limit saved.", "success");
    } catch (error) {
        console.error("Saving category limit failed:", error);
        setMessage(
            messageEl,
            error.response?.data?.message || error.message || "Unable to save category limit.",
            "error"
        );
    } finally {
        setButtonBusy(button, false, "Saving...", "Add / Update limit");
    }
}

async function removeCategoryLimit(category, period) {
    const confirmed = window.confirm(
        `Remove the ${capitalize(period)} limit for ${category}?`
    );

    if (!confirmed) return;

    const messageEl = document.getElementById("categoryBudgetMessage");

    try {
        if (!(await ensureBudgetReauth({ force: true }))) return;

        await api.delete(
            `/budget/rules/category/${encodeURIComponent(category)}?period=${encodeURIComponent(period)}`,
            budgetMutationConfig()
        );

        const response = await api.get("/budget/rules");
        budgetRules = response.data.budgetRules;

        await refreshStatus();

        setMessage(messageEl, "Category limit removed.", "success");
    } catch (error) {
        console.error("Removing category limit failed:", error);
        setMessage(
            messageEl,
            error.response?.data?.message || "Unable to remove category limit.",
            "error"
        );
    }
}

async function refreshStatus() {
    const response = await api.get("/budget/status");
    budgetStatus = response.data.usage;

    renderOverallInputs();
    renderOverview();
    renderPeriodStatus();
    renderCategoryLimits();
}

function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
