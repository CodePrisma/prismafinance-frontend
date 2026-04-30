import axios from "axios";

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || "http://localhost:3001",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("authToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;

    //Token Expirado
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes("/auth/refresh")) {
        originalRequest._retry = true;

        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
            try {
                const res = await api.post("/auth/refresh", { refreshToken });
                const newToken = res.data.token;
                localStorage.setItem("authToken", newToken);

                api.defaults.headers.Authorization = `Bearer ${newToken}`;
                originalRequest.headers.Authorization = `Bearer ${newToken}`;

                return api(originalRequest);
            } catch (error) {
                console.log("Falha ao renovar o token:", error);
                localStorage.clear();
                window.location.href = "/";
            }
        } else {
            localStorage.clear();
            window.location.href = "/";
        }
    }
    return Promise.reject(error);
}
);

export default api;
