import { http } from "./http"

export const createContract = (payload) =>
  http.post("/api/contracts", payload).then((r) => r.data)

export const listContracts = (params = {}) =>
  http.get("/api/contracts", { params }).then((r) => r.data)

export const getContract = (uuid) => http.get(`/api/contracts/${uuid}`).then((r) => r.data)

export const fundContract = (uuid, payload) =>
  http.post(`/api/contracts/${uuid}/fund`, payload).then((r) => r.data)

export const releaseContract = (uuid, txSig) =>
  http.post(`/api/contracts/${uuid}/release`, { txSig }).then((r) => r.data)

export const openDispute = (uuid, reason) =>
  http.post(`/api/contracts/${uuid}/open-dispute`, { reason }).then((r) => r.data)

export const voteDispute = (id, vote) =>
  http.put(`/api/disputes/${id}/vote`, { vote }).then((r) => r.data)

export const resolveDispute = (id, payload) => {
  const body =
    payload && typeof payload === "object"
      ? payload
      : { txSig: payload }
  return http.post(`/api/disputes/${id}/resolve`, body).then((r) => r.data)
}
