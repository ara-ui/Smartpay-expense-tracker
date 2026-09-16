const form = document.getElementById("forgotForm");
const forgotMessage = document.getElementById("forgotMessage");
const forgotSubmitBtn = document.getElementById("forgotSubmitBtn");

form.addEventListener("submit", sendMail);

async function sendMail(e) {

    e.preventDefault();

    const email = document.getElementById("email").value;

    if (forgotMessage) { forgotMessage.textContent = ""; forgotMessage.className = "auth-message"; }
    if (forgotSubmitBtn) { forgotSubmitBtn.disabled = true; forgotSubmitBtn.textContent = "Sending..."; }

    try {

        const response = await axios.post(
            `${BASE_URL}/password/forgotpassword`,
            { email }
        );

        if (forgotMessage) {
            forgotMessage.textContent = response.data.message || "Reset link sent. Check your email.";
            forgotMessage.className = "auth-message is-success";
        }

        setTimeout(() => { window.location.href = "login.html"; }, 1400);
    }
    catch (err) {

        if (forgotMessage) {
            forgotMessage.textContent = err.response?.data?.message || "Something went wrong. Please try again.";
            forgotMessage.className = "auth-message is-error";
        }
        if (forgotSubmitBtn) { forgotSubmitBtn.disabled = false; forgotSubmitBtn.textContent = "Send Reset Link"; }
    }

}
