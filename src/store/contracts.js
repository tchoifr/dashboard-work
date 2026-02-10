import { defineStore } from "pinia"
import { listContracts, getContract } from "../services/contractsApi"
import { useAuthStore } from "./auth"

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
      if (!contract?.uuid) return
      const idx = this.items.findIndex((c) => c.uuid === contract.uuid)
      if (idx === -1) {
        this.items = [contract, ...this.items]
      } else {
        this.items = this.items.map((c) => (c.uuid === contract.uuid ? contract : c))
      }
    },

    async fetchAll(params = {}) {
      this.loading = true
      this.error = null
      try {
        const data = await listContracts(params)
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
        this.items = items
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
        this.current = await getContract(uuid)
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
