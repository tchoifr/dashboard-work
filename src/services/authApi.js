// src/services/authApi.js
import { http } from "./http"

export const authNonce = (walletAddress, chain) =>
  http
    .post(
      "/auth/nonce",
      { walletAddress, chain },
      { auth: false } // ✅ PUBLIC
    )
    .then((r) => r.data)

export const authVerify = (payload) =>
  http
    .post(
      "/auth/verify",
      payload,
      { auth: false } // ✅ PUBLIC
    )
    .then((r) => r.data)

// celui-ci peut rester protégé (si tu veux)
export const verifyTransaction = (payload) =>
  http.post("/wallet/verify-transaction", payload).then((r) => r.data)
