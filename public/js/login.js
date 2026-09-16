const form=document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");

form.addEventListener("submit",loginUser);

async function loginUser(e){
    e.preventDefault();

    const user={
        email:document.getElementById("email").value,
        password:document.getElementById("password").value
    }

    if (loginMessage) { loginMessage.textContent = ""; loginMessage.className = "auth-message"; }
    if (loginSubmitBtn) { loginSubmitBtn.disabled = true; loginSubmitBtn.textContent = "Logging in..."; }

    try{
        const response=await axios.post(`${BASE_URL}/users/login`,user);
        localStorage.setItem("token", response.data.token);

        if (loginMessage) {
            loginMessage.textContent = response.data.message || "Logged in successfully.";
            loginMessage.className = "auth-message is-success";
        }
        if (loginSubmitBtn) loginSubmitBtn.textContent = "Redirecting...";

        window.location.href = "expense.html";

    }catch(err){
        console.log(err.message);
        if (loginMessage) {
            loginMessage.textContent = err.response?.data?.message || "Unable to log in. Please try again.";
            loginMessage.className = "auth-message is-error";
        }
        if (loginSubmitBtn) { loginSubmitBtn.disabled = false; loginSubmitBtn.textContent = "Log In"; }
    }
}
