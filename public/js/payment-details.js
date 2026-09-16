const details = document.getElementById("paymentDetails");
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const dateTime = (value) => value ? new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Not available";
const statusClass = (status) => status === "SUCCESSFUL" ? "success" : status === "FAILED" ? "failed" : "pending";
const statusLabel = (status) => ({ SUCCESSFUL: "Successful", FAILED: "Failed", PENDING: "Pending" })[status] || status;

const loadDetails = async () => {
    if (!id) {
        details.innerHTML = "<p>Payment details are missing.</p>";
        return;
    }
    try {
        const response = await api.get(`/payments/history/${encodeURIComponent(id)}`);
        const payment = response.data.payment;
        details.innerHTML = `
            <div class="details-amount">₹${Number(payment.amountMinor / 100).toFixed(2)}</div>
            <div class="details-status ${statusClass(payment.status)}">${escapeHtml(statusLabel(payment.status))}</div>
            <div class="details-remark">${escapeHtml(payment.remark || "No remark")}</div>
            <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${escapeHtml(payment.purpose === "INTERNAL_TRANSFER_SENT" ? "SmartPay transfer" : "Cashfree checkout")}</span></div>
            <div class="detail-row"><span class="detail-label">Payment Method</span><span class="detail-value">${escapeHtml(payment.paymentMethod || "Not available")}</span></div>
            <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${escapeHtml(dateTime(payment.transactionDate || payment.createdAt))}</span></div>
            <div class="detail-row"><span class="detail-label">Transaction ID</span><span class="detail-value">${escapeHtml(payment.providerTransactionId || "Not available")}</span></div>
            <div class="detail-row"><span class="detail-label">Order ID</span><span class="detail-value">${escapeHtml(payment.orderId)}</span></div>
            <div class="detail-row"><span class="detail-label">Provider</span><span class="detail-value">${escapeHtml(payment.provider)}</span></div>
            <div class="detail-row"><span class="detail-label">Expense</span><span class="detail-value">${payment.expenseId ? "Created" : "Not created"}</span></div>
            <a class="details-back" href="payment-history.html">← Back to History</a>
        `;
    } catch (err) {
        if (err.response?.status === 403) {
            window.location.replace("premium-required.html?return=payments.html");
            return;
        }
        details.innerHTML = `<p>${err.response?.data?.message || "Unable to load payment details."}</p>`;
    }
};

requireAuth();
if (!isPremium()) {
    window.location.replace("premium-required.html?return=payments.html");
} else {
    loadDetails();
}
