import { defineStore } from "pinia"
import { getWalletConfig } from "../services/walletApi"

export const useWalletConfigStore = defineStore("walletConfig", {
  state: () => ({
    config: null,
    loading: false,
    error: null,
    loadedAt: null,
  }),

  getters: {
    // ✅ pratique : évite d’aller lire config?.chain partout
    chain: (state) => state.config?.chain || null,
    isLoaded: (state) => !!state.config,
  },

  actions: {
    clear() {
      this.config = null
      this.loadedAt = null
      this.error = null
      this.loading = false
    },

    /**
     * auth: si ton endpoint /wallet/config a une variante authentifiée
     * force: force le refetch même si config déjà en cache
     * ttlMs: durée de validité du cache (par défaut 5 min)
     */
    async fetchWalletConfig({ auth = false, force = false, ttlMs = 5 * 60 * 1000 } = {}) {
      // ✅ si un fetch est en cours, renvoyer l’état actuel
      if (this.loading) return this.config

      // ✅ cache + TTL
      const now = Date.now()
      const isFresh =
        this.config &&
        this.loadedAt &&
        (now - this.loadedAt) < ttlMs

      if (isFresh && !force) return this.config

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
