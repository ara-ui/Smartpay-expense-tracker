const form=document.getElementById("loginForm");


form.addEventListener("submit",loginUser);

async function loginUser(e){
    e.preventDefault();

    const user={
        email:document.getElementById("email").value,
        password:document.getElementById("password").value
    }
    try{
        const response=await axios.post(`${BASE_URL}/users/login`,user);
        localStorage.setItem("token", response.data.token);
        
        alert(response.data.message);

        window.location.href = "expense.html";

    }catch(err){
        console.log(err.message);
        alert(err.response.data.message);
    }
}