const form = document.getElementById("signupForm");

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

    try {

        const response = await axios.post(
            `${BASE_URL}/users`,
            userDetails
        );

        alert(response.data.message);

        form.reset();

    }

    catch (err) {

        if (err.response){
            alert(err.response.data.message);
        }else{
            alert("Something went wrong");
        }

        console.log(err.message);
    }

}