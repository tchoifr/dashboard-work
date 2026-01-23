// src/store/jobs.js
import { defineStore } from "pinia"
import api from "../services/api"
import { useAuthStore } from "./auth"

const toIsoLabel = (iso) => {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    return d.toLocaleDateString()
  } catch {
    return ""
  }
}

const normalizeJob = (job) => {
  if (!job) return null
  return {
    id: job.id,
    title: job.title || "",
    companyName: job.companyName || "",
    locationType: job.locationType || "remote",
    locationLabel: job.locationLabel ?? null,
    jobType: job.jobType || "contract",
    budgetMin: job.budgetMin ?? null,
    budgetMax: job.budgetMax ?? null,
    currency: job.currency ?? "USDC",
    period: job.period ?? "month",
    description: job.description ?? "",
    tags: Array.isArray(job.tags) ? job.tags : [],
    status: job.status ?? null,
    rejectedReason: job.rejectedReason ?? null,
    createdAt: job.createdAt ?? null,
    publishedAt: job.publishedAt ?? null,

    // champs UI pratiques
    postedLabel: toIsoLabel(job.publishedAt || job.createdAt),
    isPublic: job.status === "published",
  }
}

export const useJobsStore = defineStore("jobs", {
  state: () => ({
    myJobs: [],
    publicJobs: [],
    publicMeta: { page: 1, limit: 20, total: 0, sort: "recent", q: "" },

    loadingMine: false,
    loadingPublic: false,
    saving: false,
    error: null,
  }),

  actions: {
    reset() {
      this.myJobs = []
      this.publicJobs = []
      this.publicMeta = { page: 1, limit: 20, total: 0, sort: "recent", q: "" }
      this.loadingMine = false
      this.loadingPublic = false
      this.saving = false
      this.error = null
    },

    async fetchMine() {
      const auth = useAuthStore()
      if (!auth.token) return

      this.loadingMine = true
      this.error = null
      try {
        const { data } = await api.get("/me/jobs")
        this.myJobs = Array.isArray(data) ? data.map(normalizeJob) : []
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to load my jobs"
        console.error("jobs.fetchMine failed", e?.response?.status, e?.response?.data || e)
        this.myJobs = []
      } finally {
        this.loadingMine = false
      }
    },

    async fetchPublic(params = {}) {
      // public route can be called without auth, but your axios interceptor will add token if present
      const q = (params.q ?? this.publicMeta.q ?? "").trim()
      const page = params.page ?? this.publicMeta.page ?? 1
      const limit = params.limit ?? this.publicMeta.limit ?? 20
      const sort = params.sort ?? this.publicMeta.sort ?? "recent"

      this.loadingPublic = true
      this.error = null
      try {
        const { data } = await api.get("/jobs", {
          params: {
            q: q || undefined,
            page,
            limit,
            sort,
            // tu peux ajouter plus tard:
            // jobType, locationType, currency, tags, budgetMin, budgetMax...
            ...params.filters,
          },
        })

        const items = Array.isArray(data?.items) ? data.items : []
        this.publicJobs = items.map(normalizeJob)

        this.publicMeta = {
          page: data?.page ?? page,
          limit: data?.limit ?? limit,
          total: data?.total ?? 0,
          sort,
          q,
        }
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to load jobs"
        console.error("jobs.fetchPublic failed", e?.response?.status, e?.response?.data || e)
        this.publicJobs = []
      } finally {
        this.loadingPublic = false
      }
    },

    async createJob(payloadFromUi) {
      const auth = useAuthStore()
      if (!auth.token) return

      // payload attendu par ton controller
      const payload = {
        title: payloadFromUi.title,
        companyName: payloadFromUi.companyName,
        locationType: payloadFromUi.locationType, // remote | hybrid | onsite
        locationLabel: payloadFromUi.locationLabel || null,
        jobType: payloadFromUi.jobType, // full_time | part_time | contract | freelance
        currency: payloadFromUi.currency, // ex: USDC
        period: payloadFromUi.period, // month | day | fixed
        budgetMin: payloadFromUi.budgetMin ?? null,
        budgetMax: payloadFromUi.budgetMax ?? null,
        description: payloadFromUi.description?.trim() || null,
        tags: Array.isArray(payloadFromUi.tags) ? payloadFromUi.tags : [],
      }

      this.saving = true
      this.error = null
      try {
        const { data } = await api.post("/jobs", payload)
        const created = normalizeJob(data)
        // prepend
        this.myJobs = [created, ...this.myJobs.filter((j) => j.id !== created.id)]
        return created
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to create job"
        console.error("jobs.createJob failed", e?.response?.status, e?.response?.data || e)
        throw e
      } finally {
        this.saving = false
      }
    },

    async updateJob(id, patch) {
      const auth = useAuthStore()
      if (!auth.token) return

      this.saving = true
      this.error = null
      try {
        const { data } = await api.patch(`/jobs/${id}`, patch)
        const updated = normalizeJob(data)
        this.myJobs = this.myJobs.map((j) => (j.id === id ? updated : j))
        return updated
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to update job"
        console.error("jobs.updateJob failed", e?.response?.status, e?.response?.data || e)
        throw e
      } finally {
        this.saving = false
      }
    },

    async deleteJob(id) {
      const auth = useAuthStore()
      if (!auth.token) return

      this.saving = true
      this.error = null
      try {
        await api.delete(`/jobs/${id}`)
        this.myJobs = this.myJobs.filter((j) => j.id !== id)
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to delete job"
        console.error("jobs.deleteJob failed", e?.response?.status, e?.response?.data || e)
        throw e
      } finally {
        this.saving = false
      }
    },

    async publishJob(id) {
      const auth = useAuthStore()
      if (!auth.token) return

      this.saving = true
      this.error = null
      try {
        const { data } = await api.patch(`/jobs/${id}/publish`)
        const updated = normalizeJob(data)
        this.myJobs = this.myJobs.map((j) => (j.id === id ? updated : j))
        return updated
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to publish job"
        console.error("jobs.publishJob failed", e?.response?.status, e?.response?.data || e)
        throw e
      } finally {
        this.saving = false
      }
    },

    async withdrawJob(id) {
      const auth = useAuthStore()
      if (!auth.token) return

      this.saving = true
      this.error = null
      try {
        const { data } = await api.patch(`/jobs/${id}/withdraw`)
        const updated = normalizeJob(data)
        this.myJobs = this.myJobs.map((j) => (j.id === id ? updated : j))
        return updated
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to withdraw job"
        console.error("jobs.withdrawJob failed", e?.response?.status, e?.response?.data || e)
        throw e
      } finally {
        this.saving = false
      }
    },
  },
})
