// src/store/profile.js
import { defineStore } from "pinia"
import api from "../services/api"
import { useAuthStore } from "./auth"

const empty = (fallbackName = "") => ({
  id: null,
  userUuid: null,
  name: fallbackName || "",
  title: "",
  location: "",
  rate: "",
  availability: "",
  bio: "",
  skills: [],
  highlights: [],
  portfolio: [],
})

export const useProfileStore = defineStore("profile", {
  state: () => ({
    profile: empty(),
    loading: false,
    saving: false,
    error: null,
  }),

  actions: {
    reset() {
      this.profile = empty()
      this.loading = false
      this.saving = false
      this.error = null
    },

    async fetchMe() {
      const auth = useAuthStore()
      if (!auth.token) return

      this.loading = true
      this.error = null
      try {
        const { data } = await api.get("/profiles/me")

        // API renvoie soit draft (id null), soit profil existant
        this.profile = {
          ...empty(auth.user?.username),
          ...(data || {}),
          skills: Array.isArray(data?.skills) ? data.skills : [],
          highlights: Array.isArray(data?.highlights) ? data.highlights : [],
          portfolio: Array.isArray(data?.portfolio) ? data.portfolio : [],
        }
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Erreur chargement profil"
        // fallback local
        this.profile = empty(auth.user?.username)
        console.error("profile.fetchMe failed", e?.response?.status, e?.response?.data || e)
      } finally {
        this.loading = false
      }
    },

    async saveMe(payloadFromUi) {
      const auth = useAuthStore()
      if (!auth.token) return

      const payload = {
        // /profiles/me ignore userUuid côté back, mais on n'envoie pas
        name: payloadFromUi?.name ?? "",
        title: payloadFromUi?.title ?? "",
        location: payloadFromUi?.location ?? "",
        rate: payloadFromUi?.rate ?? "",
        availability: payloadFromUi?.availability ?? "",
        bio: payloadFromUi?.bio ?? "",
        skills: Array.isArray(payloadFromUi?.skills) ? payloadFromUi.skills : [],
        highlights: Array.isArray(payloadFromUi?.highlights) ? payloadFromUi.highlights : [],
        portfolio: Array.isArray(payloadFromUi?.portfolio) ? payloadFromUi.portfolio : [],
      }

      this.saving = true
      this.error = null
      try {
        const { data } = await api.put("/profiles/me", payload)

        this.profile = {
          ...empty(auth.user?.username),
          ...(data || {}),
          skills: Array.isArray(data?.skills) ? data.skills : payload.skills,
          highlights: Array.isArray(data?.highlights) ? data.highlights : payload.highlights,
          portfolio: Array.isArray(data?.portfolio) ? data.portfolio : payload.portfolio,
        }

        return this.profile
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Erreur sauvegarde profil"
        console.error("profile.saveMe failed", e?.response?.status, e?.response?.data || e)
        throw e
      } finally {
        this.saving = false
      }
    },
  },
})
