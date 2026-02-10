import { http } from "./http"

export const createMessage = (payload) =>
  http.post("/api/messages", payload).then((r) => r.data)

export const deleteMessage = (id) => http.delete(`/api/messages/${id}`).then((r) => r.data)
