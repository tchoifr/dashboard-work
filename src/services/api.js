import axios from "axios"
import { useAuthStore } from "../store/auth"

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000") + "/api",
})

api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`
  config.headers.Accept = "application/json"
  return config
})

let authRedirectInProgress = false

api.interceptors.response.use(
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

      try {
        const auth = useAuthStore()
        auth.logout()
      } catch {
        // no-op
      }

      localStorage.removeItem("auth_token")
      localStorage.removeItem("token")
      localStorage.removeItem("user")

      window.location.reload()
    }

    return Promise.reject(error)
  },
)

export default api
