import { defineStore } from "pinia"
import { listContracts, getContract } from "../services/contractsApi"
import { useAuthStore } from "./auth"

const normalizeContract = (raw = {}) => {
  const contract = raw?.contract && typeof raw.contract === "object" ? raw.contract : raw
  const onchain = contract?.onchain || {}
  const amounts = contract?.amounts || {}
  const employerObj = contract?.employer || {}
  const freelancerObj = contract?.freelancer || {}

  const employerUserUuid =
    contract.employerUserUuid ||
    contract.employer_user_uuid ||
    employerObj.uuid ||
    null

  const freelancerUserUuid =
    contract.freelancerUserUuid ||
    contract.freelancer_user_uuid ||
    freelancerObj.uuid ||
    null

  return {
    ...contract,
    uuid: contract.uuid || contract.contract_uuid || contract.id || null,
    status: contract.status || "DRAFT",
    title: contract.title || contract.name || contract.jobTitle || contract.job_title || "",
    amountUsdc:
      contract.amountUsdc ??
      contract.amount_usdc ??
      contract.amountTotalUsdc ??
      contract.amount_total_usdc ??
      amounts.totalUsdc ??
      amounts.total_usdc ??
      contract.amount ??
      null,
    startAt: contract.startAt || contract.start_at || contract.starts_at || null,
    endAt: contract.endAt || contract.end_at || contract.ends_at || null,
    contractId32Hex:
      contract.contractId32Hex ||
      contract.contract_id32_hex ||
      onchain.contractId32Hex ||
      onchain.contract_id32_hex ||
      null,
    contractIdU64:
      contract.contractIdU64 ||
      contract.contract_id_u64 ||
      onchain.contractIdU64 ||
      onchain.contract_id_u64 ||
      null,
    escrowStatePda:
      contract.escrowStatePda ||
      contract.escrow_state_pda ||
      onchain.escrowStatePda ||
      onchain.escrow_state_pda ||
      null,
    vaultPda:
      contract.vaultPda ||
      contract.vault_pda ||
      onchain.vaultPda ||
      onchain.vault_pda ||
      null,
    onchain,
    amounts,
    employerUserUuid,
    freelancerUserUuid,
    employer: employerObj,
    freelancer: freelancerObj,
  }
}

export const useContractsStore = defineStore("contracts", {
  state: () => ({
    items: [],
    current: null,
    loading: false,
    error: null,
  }),

  getters: {
    myContracts(state) {
      const auth = useAuthStore()
      const myUuid = auth.user?.uuid
      if (!myUuid) return []
      return state.items.filter(
        (c) => c.employerUserUuid === myUuid || c.freelancerUserUuid === myUuid
      )
    },
  },

  actions: {
    reset() {
      this.items = []
      this.current = null
      this.loading = false
      this.error = null
    },

    upsert(contract) {
      const normalized = normalizeContract(contract)
      if (!normalized?.uuid) return
      const idx = this.items.findIndex((c) => c.uuid === normalized.uuid)
      if (idx === -1) {
        this.items = [normalized, ...this.items]
      } else {
        this.items = this.items.map((c) =>
          c.uuid === normalized.uuid ? { ...c, ...normalized } : c
        )
      }
    },

    async fetchAll(params = {}) {
      this.loading = true
      this.error = null
      try {
        const data = await listContracts(params)
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
        this.items = items.map((item) => normalizeContract(item))
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to load contracts"
      } finally {
        this.loading = false
      }
    },

    async fetchOne(uuid) {
      this.loading = true
      this.error = null
      try {
        const data = await getContract(uuid)
        this.current = normalizeContract(data?.contract || data)
        return this.current
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to load contract"
        throw e
      } finally {
        this.loading = false
      }
    },
  },
})
