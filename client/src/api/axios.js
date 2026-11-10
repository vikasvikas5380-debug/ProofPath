import axios from "axios";

const API = axios.create({
baseURL: "http://localhost:5000/api"
});

// Automatically attach JWT token to requests
API.interceptors.request.use(
(config) => {
const token = localStorage.getItem("proofpath_token");


    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
},
(error) => {
    return Promise.reject(error);
}


);

export default API;
