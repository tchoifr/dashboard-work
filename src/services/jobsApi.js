import { http } from "./http"

export const createJob = (payload) => http.post("/api/jobs", payload).then((r) => r.data)

export const listMyJobs = () => http.get("/api/me/jobs").then((r) => r.data)

export const listJobs = (params = {}) =>
  http.get("/api/jobs", { params }).then((r) => r.data)

export const getJob = (id) => http.get(`/api/jobs/${id}`).then((r) => r.data)

export const updateJob = (id, patch) =>
  http.patch(`/api/jobs/${id}`, patch).then((r) => r.data)

export const deleteJob = (id) => http.delete(`/api/jobs/${id}`).then((r) => r.data)

export const publishJob = (id) => http.patch(`/api/jobs/${id}/publish`).then((r) => r.data)

export const withdrawJob = (id) => http.patch(`/api/jobs/${id}/withdraw`).then((r) => r.data)

export const applyToJob = (id) => http.post(`/api/jobs/${id}/apply`).then((r) => r.data)

export const listJobApplications = (id) =>
  http.get(`/api/jobs/${id}/applications`).then((r) => r.data)
