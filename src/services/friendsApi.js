import { http } from "./http"

export const listFriends = () => http.get("/api/friends").then((r) => r.data)
