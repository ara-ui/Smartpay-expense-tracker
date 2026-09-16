const statusTitle = document.getElementById("paymentStatusTitle");
const statusMessage = document.getElementById("paymentStatusMessage");
const statusIcon = document.getElementById("paymentStatusIcon");
const retryButton = document.getElementById("paymentRetryButton");
const dashboardButton = document.getElementById("paymentDashboardButton");

const setReturnButton = (purpose) => {
    dashboardButton.textContent = purpose === "EXPENSE_PAYMENT" ? "Back to Payments" : "Back to Dashboard";
    dashboardButton.onclick = () => {
        window.location.replace(purpose === "EXPENSE_PAYMENT" ? "payments.html" : "expense.html");
    };
};

setReturnButton(null);

const setStatus = (type, title, message) => {
    document.body.dataset.status = type;
    statusTitle.textContent = title;
    statusMessage.textContent = message;
    statusIcon.textContent = type === "success" ? "✓" : type === "failed" ? "✕" : "…";
};

const verifyPayment = async (orderId) => {
    const token = getToken();
    if (!token) {
        logout("login.html");
        return;
    }
    const response = await axios.post(
        `${BASE_URL}/purchase/updatetransactionstatus`,
        { order_id: orderId },
        { headers: { Authorization: token } }
    );
    return response.data;
};

const runVerification = async () => {
    const params = new URLSearchParams(window.location.search);
    // Cashfree appends order_id to the configured return_url. This is the
    // authoritative browser-side identifier; sessionStorage is only a
    // backwards-compatible fallback for old sessions.
    const orderId = params.get("order_id") || sessionStorage.getItem("pendingPaymentOrderId");

    if (!orderId) {
        setStatus(
            "failed",
            "Payment details missing",
            "We could not identify the payment order. Please start a new payment."
        );
        retryButton.hidden = false;
        return;
    }

    setStatus(
        "pending",
        "Verifying your payment…",
        "Please wait while we confirm the payment securely with Cashfree."
    );

    for (let attempt = 0; attempt < 6; attempt += 1) {
        try {
            const result = await verifyPayment(orderId);
            setReturnButton(result?.purpose);

            if (result?.success && result?.token) {
                sessionStorage.removeItem("pendingPaymentOrderId");
                sessionStorage.removeItem("pendingPaymentPurpose");
                setToken(result.token);
                setStatus(
                    "success",
                    "Payment Successful",
                    result.purpose === "EXPENSE_PAYMENT"
                        ? "Payment confirmed and your expense was added automatically. Redirecting you to Payments…"
                        : "Your Premium membership is active. Redirecting you to your dashboard…"
                );

                const premiumReturn = sessionStorage.getItem("pendingPremiumReturn");
                sessionStorage.removeItem("pendingPremiumReturn");
                setTimeout(() => {
                    window.location.replace(
                        result.redirect_to === "payments.html"
                            ? "payments.html"
                            : premiumReturn || result.redirect_to || "expense.html"
                    );
                }, 1200);
                return;
            }

            if (result?.pending) {
                if (attempt < 5) {
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    continue;
                }
                setStatus(
                    "pending",
                    "Payment Pending",
                    "Cashfree has not reported a final payment status yet. You can check again shortly."
                );
                retryButton.hidden = false;
                return;
            }

            setStatus(
                "failed",
                "Payment Not Successful",
                result?.message || "The payment was not completed successfully."
            );
            retryButton.hidden = false;
            return;
        } catch (err) {
            if (err.response?.status === 202 && attempt < 5) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                continue;
            }
            console.error("Payment verification failed:", err);
            setStatus(
                "failed",
                "Unable to verify payment",
                err.response?.data?.message || "We could not verify the payment right now. Please try again."
            );
            retryButton.hidden = false;
            return;
        }
    }
};

retryButton.addEventListener("click", () => window.location.reload());

requireAuth();
runVerification();
