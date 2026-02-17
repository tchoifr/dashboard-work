import { http } from "./http"

export const createContract = (payload) =>
  http.post("/api/contracts", payload).then((r) => r.data)

export const listContracts = (params = {}) =>
  http.get("/api/contracts", { params }).then((r) => r.data)

export const listAdminDisputes = (params = {}) =>
  http.get("/api/admin/disputes", { params }).then((r) => r.data)

export const getAdminDispute = (id) =>
  http.get(`/api/admin/disputes/${id}`).then((r) => r.data)

export const resetDisputeVotes = (id) =>
  http.post(`/api/admin/disputes/${id}/reset-votes`, {}).then((r) => r.data)

export const listDisputeContracts = async ({ page = 1, limit = 20 } = {}) => {
  const extractItems = (data) => {
    if (Array.isArray(data?.items)) return data.items
    if (Array.isArray(data?.disputes)) return data.disputes
    if (Array.isArray(data?.contracts)) return data.contracts
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data)) return data
    return []
  }

  const hasOpenDispute = (contract) => {
    const contractStatus = String(contract?.status || "").toUpperCase()
    const disputeStatus = String(
      contract?.dispute?.status || contract?.disputeStatus || contract?.dispute_status || "",
    ).toUpperCase()
    const hasDisputeId = Boolean(
      contract?.dispute?.id ||
        contract?.disputeId ||
        contract?.dispute_id ||
        contract?.escrowDisputeId ||
        contract?.escrow_dispute_id,
    )
    return disputeStatus === "OPEN" || contractStatus === "DISPUTE_OPEN" || hasDisputeId
  }

  const attempts = [
    { status: "DISPUTE_OPEN", page, limit },
    { status: "OPEN", page, limit },
    { page, limit: Math.max(limit, 100) },
  ]

  let best = []
  let lastError = null

  for (const params of attempts) {
    try {
      const data = await listContracts(params)
      const items = extractItems(data)
      if (items.length > best.length) best = items
      const direct = items.filter(hasOpenDispute)
      if (direct.length) return direct
    } catch (error) {
      lastError = error
      const status = error?.response?.status
      if (status && status !== 400 && status !== 404) throw error
    }
  }

  // Fallback: hydrate each contract with GET /api/contracts/{uuid}
  if (best.length) {
    const hydrated = await Promise.all(
      best.map(async (item) => {
        const uuid = item?.uuid || item?.id
        if (!uuid) return item
        try {
          const detail = await getContract(uuid)
          const contract =
            detail?.contract && typeof detail.contract === "object" ? detail.contract : detail || {}
          return {
            ...item,
            ...contract,
            dispute: contract?.dispute ?? detail?.dispute ?? item?.dispute ?? null,
          }
        } catch {
          return item
        }
      }),
    )
    return hydrated.filter(hasOpenDispute)
  }

  // Optional backend fallback: /api/disputes?status=OPEN
  try {
    const disputesResp = await http.get("/api/disputes", {
      params: { status: "OPEN", page, limit },
    })
    const disputes = extractItems(disputesResp?.data)
    if (disputes.length) {
      const contracts = await Promise.all(
        disputes.map(async (d) => {
          const contractUuid =
            d?.contractUuid || d?.contract_uuid || d?.contractId || d?.contract_id || null
          if (!contractUuid) return null
          try {
            const detail = await getContract(contractUuid)
            const contract =
              detail?.contract && typeof detail.contract === "object" ? detail.contract : detail || {}
            return {
              ...contract,
              dispute: contract?.dispute ?? detail?.dispute ?? d,
            }
          } catch {
            return null
          }
        }),
      )
      return contracts.filter(Boolean)
    }
  } catch {
    // endpoint may not exist; ignore
  }

  if (lastError) throw lastError
  return []
}

export const getContract = (uuid) => http.get(`/api/contracts/${uuid}`).then((r) => r.data)

export const fundContract = (uuid, payload) =>
  http.post(`/api/contracts/${uuid}/fund`, payload).then((r) => r.data)

export const releaseContract = (uuid, txSig) =>
  http.post(`/api/contracts/${uuid}/release`, { txSig }).then((r) => r.data)

export const openDispute = (uuid, reason) =>
  http.post(`/api/contracts/${uuid}/open-dispute`, { reason }).then((r) => r.data)

export const voteDispute = (id, vote) =>
  http.put(`/api/disputes/${id}/vote`, { vote }).then((r) => r.data)

export const buildResolveTx = (id) =>
  http.post(`/api/disputes/${id}/build-resolve-tx`, {}).then((r) => r.data)

export const resolveDispute = (id, payload) => {
  const body =
    payload && typeof payload === "object"
      ? payload
      : { txSig: payload }
  return http.post(`/api/disputes/${id}/resolve`, body).then((r) => r.data)
}
