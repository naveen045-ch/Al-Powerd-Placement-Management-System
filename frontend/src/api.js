
import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically attach JWT token to API requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Handle FormData requests
    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData
    ) {
      const headers = config.headers;

      if (headers && typeof headers.delete === "function") {
        headers.delete("Content-Type");
      } else if (headers) {
        delete headers["Content-Type"];
        delete headers["content-type"];

        if (headers.common) {
          delete headers.common["Content-Type"];
          delete headers.common["content-type"];
        }

        if (headers.post) {
          delete headers.post["Content-Type"];
          delete headers.post["content-type"];
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle API response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Session expired or authentication failed.");
    }

    return Promise.reject(error);
  }
);

export default api;
