// src/services/http.js
import axios from "axios"

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
})

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
