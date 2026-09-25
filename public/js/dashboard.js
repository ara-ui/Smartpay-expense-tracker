(function () {
    function formatCurrency(value) {
        const amount = Number(value) || 0;
        return `₹${amount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    async function loadDashboardSummary() {
        try {
            const response = await api.get("/users/stats");
            const stats = response.data || {};

            setText("dashboardTotalSpent", formatCurrency(stats.totalExpenses));
            setText("dashboardMonthSpent", formatCurrency(stats.thisMonthExpenses));
            setText("dashboardTodaySpent", formatCurrency(stats.todayExpenses));
            setText("dashboardTopCategory", stats.highestCategory || "No expenses yet");
        } catch (error) {
            console.error("Unable to load dashboard summary:", error);
            [
                "dashboardTotalSpent",
                "dashboardMonthSpent",
                "dashboardTodaySpent",
                "dashboardTopCategory"
            ].forEach((id) => setText(id, "—"));
        }
    }

    function renderGreeting() {
        const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
        const name = user?.name?.trim() || "there";
        setText("dashboardGreeting", `Good to see you, ${name}`);
        setText("dashboardSubheading", "Here's a clear view of your spending today.");
    }

    document.addEventListener("DOMContentLoaded", () => {
        renderGreeting();
        loadDashboardSummary();
    });
})();
