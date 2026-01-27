import axios from "axios"
import { useAuthStore } from "../store/auth"

function normalizeBase(base) {
  // Si on te met .../api on garde, sinon on ajoute /api
  if (!base) return "http://127.0.0.1:8000/api"
  return base.endsWith("/api") ? base : `${base.replace(/\/$/, "")}/api`
}

const api = axios.create({
  baseURL: normalizeBase(import.meta.env.VITE_API_BASE_URL),
})

api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

export default api
