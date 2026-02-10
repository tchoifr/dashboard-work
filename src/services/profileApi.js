import { http } from "./http"

export const getMyProfile = () => http.get("/api/profiles/me").then((r) => r.data)

export const updateMyProfile = (payload) =>
  http.patch("/api/profiles/me", payload).then((r) => r.data)
