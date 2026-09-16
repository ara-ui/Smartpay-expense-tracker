const BASE_URL = window.location.origin;

const api = axios.create({
    baseURL: BASE_URL
});

api.interceptors.request.use((config) => {

    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = token;
    }

    return config;
});

api.interceptors.response.use(

    (response) => response,

    (error) => {

        if (error.response && error.response.status === 401) {

            localStorage.removeItem("token");

            alert("Session expired. Please login again.");

            window.location.href = "login.html";
        }

        return Promise.reject(error);
    }

);