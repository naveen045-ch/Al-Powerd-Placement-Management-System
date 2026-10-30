import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080",
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
    // Let the browser/Axios set the correct multipart boundary
// whenever the request body is FormData.
if (
  typeof FormData !== "undefined" &&
  config.data instanceof FormData
) {
  const headers = config.headers;

  if (headers && typeof headers.delete === "function") {
    // AxiosHeaders (Axios 1.x)
    headers.delete("Content-Type");
  } else if (headers) {
    // Compatibility with plain header objects
    delete headers["Content-Type"];
    delete headers["content-type"];

    // Older Axios versions may keep method/common defaults nested.
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
      console.error(
        "Session expired or authentication failed."
      );
    }

    return Promise.reject(error);
  }
);

export default api;