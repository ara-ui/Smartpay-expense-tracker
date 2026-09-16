const form = document.getElementById("signupForm");
const signupMessage = document.getElementById("signupMessage");
const signupSubmitBtn = document.getElementById("signupSubmitBtn");

if (form) {
    form.addEventListener("submit", addUser);
}

async function addUser(e) {

    e.preventDefault();

    const userDetails = {

        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value

    };

    if (signupMessage) { signupMessage.textContent = ""; signupMessage.className = "auth-message"; }
    if (signupSubmitBtn) { signupSubmitBtn.disabled = true; signupSubmitBtn.textContent = "Creating account..."; }

    try {

        const response = await axios.post(
            `${BASE_URL}/users`,
            userDetails
        );

        if (signupMessage) {
            signupMessage.textContent = response.data.message || "Account created successfully.";
            signupMessage.className = "auth-message is-success";
        }

        form.reset();

    }

    catch (err) {

        const message = err.response
            ? err.response.data.message
            : "Something went wrong";

        if (signupMessage) {
            signupMessage.textContent = message;
            signupMessage.className = "auth-message is-error";
        }

        console.log(err.message);

    } finally {
        if (signupSubmitBtn) { signupSubmitBtn.disabled = false; signupSubmitBtn.textContent = "Sign Up"; }
    }

}
