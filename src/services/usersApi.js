import { http } from "./http"

export const listUsers = (params = {}) =>
  http.get("/api/users", { params }).then((r) => r.data)

export const getUser = (uuid) => http.get(`/api/users/${uuid}`).then((r) => r.data)

export const createUser = (payload) =>
  http.post("/api/users", payload).then((r) => r.data)

export const updateUser = (uuid, payload) =>
  http.patch(`/api/users/${uuid}`, payload).then((r) => r.data)

export const deleteUser = (uuid) => http.delete(`/api/users/${uuid}`).then((r) => r.data)
