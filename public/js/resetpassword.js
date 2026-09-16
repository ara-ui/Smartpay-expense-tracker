const form = document.getElementById("resetForm");

const passwordInput =
    document.getElementById("password");

const confirmPasswordInput =
    document.getElementById("confirmPassword");

const passwordStrength =
    document.getElementById("passwordStrength");

const passwordError =
    document.getElementById("passwordError");

const updatePasswordBtn =
    document.getElementById("updatePasswordBtn");




passwordInput.addEventListener("input", function () {

    const password = passwordInput.value;

    if (!password) {
        passwordStrength.textContent =
            "Password strength: —";

        return;
    }

    let score = 0;

    // Length
    if (password.length >= 5) {
        score++;
    }

    // Uppercase
    if (/[A-Z]/.test(password)) {
        score++;
    }

    // Lowercase
    if (/[a-z]/.test(password)) {
        score++;
    }

    // Number
    if (/[0-9]/.test(password)) {
        score++;
    }

    // Special character
    if (/[^A-Za-z0-9]/.test(password)) {
        score++;
    }


    if (score <= 1) {

        passwordStrength.textContent =
            "Password strength: Weak";

    } else if (score <= 3) {

        passwordStrength.textContent =
            "Password strength: Medium";

    } else {

        passwordStrength.textContent =
            "Password strength: Strong";
    }

});




passwordInput.addEventListener("input", function () {

    passwordError.textContent = "";

});

confirmPasswordInput.addEventListener("input", function () {

    passwordError.textContent = "";

});




form.addEventListener("submit", updatePassword);


async function updatePassword(e) {

    e.preventDefault();


    const password =
        passwordInput.value.trim();

    const confirmPassword =
        confirmPasswordInput.value.trim();


    /* Minimum length */

    if (password.length < 5) {

        passwordError.textContent =
            "Password must be at least 5 characters.";

        return;
    }


    /* Password confirmation */

    if (password !== confirmPassword) {

        passwordError.textContent =
            "Passwords do not match.";

        return;
    }


    /* Get reset ID from URL */

    const id =
        window.location.pathname.split("/").pop();


    /* Loading state */

    updatePasswordBtn.disabled = true;

    updatePasswordBtn.textContent =
        "Updating Password...";


    try {

        const response = await axios.post(
            `/password/updatepassword/${id}`,
            {
                password
            }
        );


        /* Success */

        passwordError.style.color = "#15803d";

        passwordError.textContent =
            response.data.message ||
            "Password updated successfully.";


        updatePasswordBtn.textContent =
            "Password Updated";


        /* Give user time to see success */

        setTimeout(() => {

            window.location.href =
                "/login.html";

        }, 1200);


    } catch (err) {

        passwordError.style.color =
            "#dc3545";

        passwordError.textContent =
            err.response?.data?.message ||
            "Something went wrong.";

        updatePasswordBtn.disabled = false;

        updatePasswordBtn.textContent =
            "Update Password";
    }

}