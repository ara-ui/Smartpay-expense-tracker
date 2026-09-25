const demoBalance = document.getElementById("demoBalance");
const demoPaymentId = document.getElementById("demoPaymentId");
const receivePaymentId = document.getElementById("receivePaymentId");
const copyPaymentId = document.getElementById("copyPaymentId");
const copyReceiveId = document.getElementById("copyReceiveId");
const sendMoneyButton = document.getElementById("sendMoneyButton");
const receiveMoneyButton = document.getElementById("receiveMoneyButton");
const refreshWallet = document.getElementById("refreshWallet");
const walletMessage = document.getElementById("walletMessage");
const demoTransferHistory = document.getElementById("demoTransferHistory");
const demoTransferForm = document.getElementById("demoTransferForm");
const demoRecipientPaymentId = document.getElementById("demoRecipientPaymentId");
const demoTransferAmount = document.getElementById("demoTransferAmount");
const demoTransferRemark = document.getElementById("demoTransferRemark");
const demoTransferButton = document.getElementById("demoTransferButton");
const demoTransferMessage = document.getElementById("demoTransferMessage");
const retryWalletButton = document.getElementById("retryWalletButton");

const formatMoney = (minor) => `₹${(Number(minor || 0) / 100).toFixed(2)}`;
const formatDate = (value) => new Date(value).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit"
});
const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const maskPaymentId = (value) => {
    const id = String(value || "");
    if (!id) return "Unavailable";
    const at = id.indexOf("@");
    return at > 0 ? `${"•".repeat(Math.min(Math.max(at, 6), 12))}${id.slice(at)}` : "•".repeat(Math.min(Math.max(id.length, 8), 14));
};

// Last-known wallet snapshot, keyed to the current session's token so it
// never leaks between different logged-in users on the same browser. Used
// only to paint the balance/Payment ID instantly on page load while the
// real, authoritative fetch is still in flight - never as a substitute
// for it.
const walletCacheKey = () => `smartpay_wallet_cache:${localStorage.getItem("token") || ""}`;
const readWalletCache = () => {
    try {
        const raw = localStorage.getItem(walletCacheKey());
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
};
const writeWalletCache = (wallet) => {
    try {
        localStorage.setItem(walletCacheKey(), JSON.stringify({
            balanceMinor: wallet.balanceMinor,
            paymentId: wallet.paymentId
        }));
    } catch { /* localStorage unavailable - cache is a nice-to-have only */ }
};

let currentPaymentId = "";
let currentEmail = String(getCurrentUser()?.email || "").toLowerCase();
let walletData = null;
let activityData = [];

const openModal = (id) => { const el = document.getElementById(id); if (el) el.hidden = false; };
const closeModal = (id) => { const el = document.getElementById(id); if (el) el.hidden = true; };

document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.dataset.close));
});
document.querySelectorAll(".wallet-modal").forEach((modal) => {
    modal.addEventListener("click", (event) => { if (event.target === modal) modal.hidden = true; });
});

const copyText = async (value, button) => {
    if (!value) return;
    try {
        await navigator.clipboard.writeText(value);
        const oldText = button.textContent;
        button.textContent = "Copied";
        setTimeout(() => { button.textContent = oldText; }, 1200);
    } catch { walletMessage.textContent = "Could not copy the Payment ID. Please copy it manually."; }
};

const showDetail = (transfer) => {
    const senderEmail = String(transfer.senderId?.email || "").toLowerCase();
    const isSent = senderEmail === currentEmail;
    const other = isSent ? transfer.receiverId : transfer.senderId;
    document.getElementById("detailEyebrow").textContent = isSent ? "SENT PAYMENT" : "MONEY RECEIVED";
    document.getElementById("detailTitle").textContent = isSent ? "Payment Details" : "Receipt Details";
    const detailAmountEl = document.getElementById("detailAmount");
    detailAmountEl.textContent = `${isSent ? "−" : "+"}${formatMoney(transfer.amountMinor)}`;
    detailAmountEl.className = isSent ? "amount-sent" : "amount-received";
    document.getElementById("detailOther").textContent = `${isSent ? "Paid to " : "Received from "}${other?.name || "SmartPay user"}`;
    document.getElementById("detailOtherPaymentId").textContent = other?.paymentId || "—";
    document.getElementById("detailRemark").textContent = transfer.remark || "—";
    document.getElementById("detailDate").textContent = formatDate(transfer.createdAt);
    document.getElementById("detailTransferId").textContent = transfer.transferId || "—";
    document.getElementById("detailStatus").textContent = transfer.status || "Successful";
    openModal("paymentDetailModal");
};

const renderHistory = (transfers) => {
    activityData = Array.isArray(transfers) ? transfers : [];
    if (!activityData.length) {
        demoTransferHistory.innerHTML = `<div class="payment-empty">
            <p class="empty-state-title">No wallet activity yet</p>

        </div>`;
        return;
    }
    demoTransferHistory.innerHTML = activityData.map((transfer, index) => {
        const senderEmail = String(transfer.senderId?.email || "").toLowerCase();
        const isSent = senderEmail === currentEmail;
        const other = isSent ? transfer.receiverId : transfer.senderId;
        const name = other?.name || "SmartPay user";
        const id = other?.paymentId || "";
        const direction = isSent ? "sent" : "received";
        return `<button type="button" class="payment-row payment-row-button payment-row-${direction}" data-activity-index="${index}">
            <span><strong class="payment-amount payment-amount-${direction}">${isSent ? "−" : "+"}${formatMoney(transfer.amountMinor)}</strong>
            <small class="payment-label">${escapeHtml(isSent ? `Paid to ${name}` : `Received from ${name}`)}</small>
            ${id ? `<small class="payment-label">${escapeHtml(id)}</small>` : ""}</span>
            <span class="payment-row-right"><small class="payment-type payment-type-${direction}">${isSent ? "SENT" : "RECEIVED"}</small><span class="payment-time">${formatDate(transfer.createdAt)}</span></span>
        </button>`;
    }).join("");
    demoTransferHistory.querySelectorAll("[data-activity-index]").forEach((row) => {
        row.addEventListener("click", () => showDetail(activityData[Number(row.dataset.activityIndex)]));
    });
};

const loadWalletOnly = async () => {
    try {
        const response = await api.get("/payments/demo/wallet", { timeout: 8000 });
        const wallet = response.data.wallet;
        walletData = wallet;
        currentPaymentId = wallet.paymentId || "";
        currentEmail = String(wallet.email || "").toLowerCase();
        demoBalance.textContent = formatMoney(wallet.balanceMinor);
        demoPaymentId.textContent = maskPaymentId(wallet.paymentId);
        receivePaymentId.textContent = wallet.paymentId || "Unavailable";
        retryWalletButton.hidden = true;
        writeWalletCache(wallet);
        return wallet;
    } catch (err) {
        if (err.response?.status === 403) { window.location.replace("premium-required.html?return=payments.html"); return null; }
        demoBalance.textContent = "—";
        demoPaymentId.textContent = "Unavailable";
        receivePaymentId.textContent = "Unavailable";
        walletMessage.textContent = err.code === "ECONNABORTED" ? "Wallet is taking too long to respond. Please refresh." : (err.response?.data?.message || "Couldn't load your wallet. Please try again.");
        retryWalletButton.hidden = false;
        return null;
    }
};

const loadActivity = async () => {
    try {
        const response = await api.get("/payments/demo/history?limit=10", { timeout: 8000 });
        renderHistory(response.data.transfers || []);
    } catch (err) {
        demoTransferHistory.innerHTML = `<div class="payment-empty">
            <p class="empty-state-title">Couldn't load wallet activity</p>
            <p class="empty-state-hint">Your balance above is still accurate. Try refreshing in a moment.</p>
        </div>`;
    }
};

const loadWallet = async () => {
    walletMessage.textContent = "";
    retryWalletButton.hidden = true;
    demoTransferHistory.innerHTML = '<div class="payment-empty payment-loading">Loading wallet activity...</div>';
    await Promise.allSettled([loadWalletOnly(), loadActivity()]);
};

// Paint the last-known balance/Payment ID instantly (if we have one for
// this session) so the page never sits on a bare skeleton while the real,
// authoritative fetch below is already on its way in parallel.
const cachedWallet = readWalletCache();
if (cachedWallet) {
    if (typeof cachedWallet.balanceMinor === "number") demoBalance.textContent = formatMoney(cachedWallet.balanceMinor);
    if (cachedWallet.paymentId) {
        demoPaymentId.textContent = maskPaymentId(cachedWallet.paymentId);
        receivePaymentId.textContent = cachedWallet.paymentId;
    }
}

retryWalletButton.addEventListener("click", loadWalletOnly);

sendMoneyButton.addEventListener("click", () => {
    demoTransferMessage.textContent = "";
    demoTransferForm.reset();
    openModal("sendModal");
    demoRecipientPaymentId.focus();
});
receiveMoneyButton.addEventListener("click", () => {
    receivePaymentId.textContent = currentPaymentId || "Loading...";
    openModal("receiveModal");
});
copyPaymentId.addEventListener("click", () => copyText(currentPaymentId, copyPaymentId));
copyReceiveId.addEventListener("click", () => copyText(currentPaymentId, copyReceiveId));
refreshWallet.addEventListener("click", loadWallet);

demoTransferForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    demoTransferMessage.textContent = "";
    const recipientPaymentId = demoRecipientPaymentId.value.trim().toLowerCase();
    const amount = Number(demoTransferAmount.value);
    const remark = demoTransferRemark.value.trim() || "SmartPay transfer";
    if (!recipientPaymentId) return void (demoTransferMessage.textContent = "Enter the recipient's SmartPay Payment ID.");
    if (!Number.isFinite(amount) || amount <= 0) return void (demoTransferMessage.textContent = "Enter a valid amount.");
    if (recipientPaymentId === currentPaymentId) return void (demoTransferMessage.textContent = "You cannot send money to your own Payment ID.");
    demoTransferButton.disabled = true; demoTransferButton.textContent = "Processing...";
    try {
        const response = await api.post("/payments/demo/transfer", { recipientPaymentId, amount, remark }, { headers: { "Idempotency-Key": crypto.randomUUID() }, timeout: 12000 });
        const transfer = response.data.transfer;
        if (response.data.transfer?.senderBalanceAfterMinor != null) {
            demoBalance.textContent = formatMoney(response.data.transfer.senderBalanceAfterMinor);
        }
        demoTransferMessage.textContent = `✓ ${response.data.message}`;
        closeModal("sendModal");
        await Promise.allSettled([loadWalletOnly(), loadActivity()]);
        if (transfer) setTimeout(() => showDetail(transfer), 150);
    } catch (err) {
        demoTransferMessage.textContent = err.code === "ECONNABORTED" ? "Payment is taking too long. Check your activity before trying again." : (err.response?.data?.message || "Payment could not be completed.");
    } finally { demoTransferButton.disabled = false; demoTransferButton.textContent = "Continue"; }
});

requireAuth();
if (!isPremium()) window.location.replace("premium-required.html?return=payments.html");
else loadWallet();

// Chrome/Firefox can restore this page from the back/forward cache when the
// user navigates away and then back (browser Back/Forward, not an in-page
// link). A bfcache restore does NOT re-run DOMContentLoaded, so without this
// the page stays frozen on whatever it showed at the moment of navigating
// away - including "Loading..." if the wallet hadn't finished fetching yet.
// event.persisted is true only for a bfcache restore, so this never causes
// a duplicate load on a normal first visit.
window.addEventListener("pageshow", (event) => {
    if (event.persisted) loadWallet();
});
