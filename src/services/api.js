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

export default api
