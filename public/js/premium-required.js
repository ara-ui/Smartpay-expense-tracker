document.addEventListener("DOMContentLoaded", () => {
    const user = requireAuth();
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const returnTo = ["budget.html", "payments.html"].includes(params.get("return"))
        ? params.get("return")
        : "expense.html";

    if (isPremium()) {
        window.location.replace(returnTo);
        return;
    }

    const upgradeButton = document.getElementById("upgradeBtn");
    const dashboardButton = document.getElementById("dashboardBtn");

    upgradeButton?.addEventListener("click", buyPremium);
    dashboardButton?.addEventListener("click", () => {
        window.location.href = "expense.html";
    });
});
