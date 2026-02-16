import { http } from "./http"

export const createPrivateConversation = (userUuid) =>
  http.post("/api/conversations/private", { user_id: userUuid }).then((r) => r.data)

export const listConversations = () => http.get("/api/conversations").then((r) => r.data)

export const getConversationMessages = (id) =>
  http.get(`/api/conversations/${id}/messages`).then((r) => r.data)

export const deleteConversation = (id) =>
  http.delete(`/api/conversations/${id}`).then((r) => r.data)
