import axios from "axios"

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
})

export default publicApi
