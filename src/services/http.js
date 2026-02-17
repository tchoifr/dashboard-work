// src/services/http.js
import axios from "axios"

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
})

let authRedirectInProgress = false

http.interceptors.request.use((config) => {
  // ✅ si route publique
  if (config.auth === false) {
    if (config.headers) delete config.headers.Authorization
    return config
  }

  const token = localStorage.getItem("auth_token") || localStorage.getItem("token")

  if (token && token !== "null" && token !== "undefined") {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  } else {
    if (config.headers) delete config.headers.Authorization
  }

  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const message = String(
      error?.response?.data?.message || error?.message || "",
    ).toLowerCase()

    const isExpiredToken =
      status === 401 ||
      message.includes("expired jwt token") ||
      message.includes("jwt expired") ||
      message.includes("token expired")

    if (isExpiredToken && !authRedirectInProgress) {
      authRedirectInProgress = true

      // Hard logout session data
      localStorage.removeItem("auth_token")
      localStorage.removeItem("token")
      localStorage.removeItem("user")

      // Reload app to reset all stores and return to AuthLanding
      window.location.reload()
    }

    return Promise.reject(error)
  },
)
