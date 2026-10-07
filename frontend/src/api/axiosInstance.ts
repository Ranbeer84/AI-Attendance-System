import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

// NOTE: do NOT set a default "Content-Type" here. With a default of
// "application/json", axios converts any FormData body into a JSON string
// (files become {}), so multipart uploads reach FastAPI without a `files`
// field and fail with 422. Axios already sets JSON automatically for plain
// objects, and lets the browser set multipart + boundary for FormData.
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Attach the JWT access token to every outgoing request, if we have one.
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If any request comes back 401, the token is invalid/expired -- clear
// storage and force a redirect to login. Kept intentionally simple for now;
// refresh-token rotation can be added later without changing callers.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;