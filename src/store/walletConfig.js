import { defineStore } from "pinia"
import { getWalletConfig } from "../services/walletApi"

export const useWalletConfigStore = defineStore("walletConfig", {
  state: () => ({
    config: null,
    loading: false,
    error: null,
    loadedAt: null,
  }),

  actions: {
    async fetchWalletConfig({ auth = false, force = false } = {}) {
      if (this.loading) return this.config
      if (this.config && !force) return this.config

      this.loading = true
      this.error = null

      try {
        const config = await getWalletConfig({ auth })
        if (!config) throw new Error("Config wallet vide")
        this.config = config
        this.loadedAt = Date.now()
        return this.config
      } catch (e) {
        this.error = e?.message || "Impossible de charger la config wallet"
        throw e
      } finally {
        this.loading = false
      }
    },
  },
})
