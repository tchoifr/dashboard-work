import { defineStore } from "pinia"
import api from "../services/api"
import { useAuthStore } from "./auth"

const toIsoLabel = (iso) => {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return ""
  }
}

const normalizeJob = (job) => {
  if (!job) return null

  const applicantsCount =
    typeof job.applicantsCount === "number"
      ? job.applicantsCount
      : Array.isArray(job.applicants)
        ? job.applicants.length
        : 0

  return {
    id: job.id,
    title: job.title || "",
    companyName: job.companyName || "",
    locationType: job.locationType || "remote",
    locationLabel: job.locationLabel ?? null,
    jobType: job.jobType || "contract",
    budgetLabel: job.budgetLabel ?? null,
    description: job.description ?? "",
    tags: Array.isArray(job.tags) ? job.tags : [],

    status: job.status ?? "pending",
    rejectedReason: job.rejectedReason ?? null,

    createdAt: job.createdAt ?? null,
    publishedAt: job.publishedAt ?? null,

    // utile pour empêcher Apply si c'est ton job
    ownerId: job.ownerId ?? null,

    // UI
    postedLabel: toIsoLabel(job.publishedAt || job.createdAt),
    applicantsCount,
  }
}

export const useJobsStore = defineStore("jobs", {
  state: () => ({
    // Owner jobs
    myJobs: [],
    loadingMine: false,

    // Browse jobs (protégé JWT aussi)
    jobs: [],
    jobsMeta: { page: 1, limit: 20, total: 0, sort: "recent", q: "" },
    loadingJobs: false,

    // Applicants per job (owner only)
    applicantsByJobId: {}, // { [jobId]: { loading, error, items: [] } }

    saving: false,
    error: null,
  }),

  getters: {
    applicantsState: (state) => (jobId) =>
      state.applicantsByJobId[jobId] || { loading: false, error: null, items: [] },
  },

  actions: {
    reset() {
      this.myJobs = []
      this.jobs = []
      this.jobsMeta = { page: 1, limit: 20, total: 0, sort: "recent", q: "" }
      this.applicantsByJobId = {}
      this.loadingMine = false
      this.loadingJobs = false
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
        this.myJobs = []
      } finally {
        this.loadingMine = false
      }
    },

    async fetchJobs(params = {}) {
      const auth = useAuthStore()
      if (!auth.token) return

      const q = (params.q ?? this.jobsMeta.q ?? "").trim()
      const page = params.page ?? this.jobsMeta.page ?? 1
      const limit = params.limit ?? this.jobsMeta.limit ?? 20
      const sort = params.sort ?? this.jobsMeta.sort ?? "recent"

      this.loadingJobs = true
      this.error = null
      try {
        const { data } = await api.get("/jobs", {
          params: {
            q: q || undefined,
            page,
            limit,
            sort,
            ...(params.filters || {}),
          },
        })

        const items = Array.isArray(data?.items) ? data.items : []
        this.jobs = items.map(normalizeJob)

        this.jobsMeta = {
          page: data?.page ?? page,
          limit: data?.limit ?? limit,
          total: data?.total ?? 0,
          sort,
          q,
        }
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to load jobs"
        this.jobs = []
      } finally {
        this.loadingJobs = false
      }
    },

    async createJob(payloadFromUi) {
      const auth = useAuthStore()
      if (!auth.token) return

      // payload attendu par ton JobService->create
      const payload = {
        title: payloadFromUi.title,
        companyName: payloadFromUi.companyName,
        locationType: payloadFromUi.locationType,
        locationLabel: payloadFromUi.locationLabel || null,
        jobType: payloadFromUi.jobType,
        budgetLabel: payloadFromUi.budgetLabel ?? null,
        description: payloadFromUi.description?.trim() || "",
        tags: Array.isArray(payloadFromUi.tags) ? payloadFromUi.tags : [],
      }

      this.saving = true
      this.error = null
      try {
        const { data } = await api.post("/jobs", payload)
        const created = normalizeJob(data)
        this.myJobs = [created, ...this.myJobs.filter((j) => j.id !== created.id)]
        return created
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to create job"
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
        throw e
      } finally {
        this.saving = false
      }
    },

    // Freelance applies
    async applyToJob(jobId) {
      const auth = useAuthStore()
      if (!auth.token) return

      this.saving = true
      this.error = null
      try {
        const { data } = await api.post(`/jobs/${jobId}/apply`, {})
        return data
      } catch (e) {
        // ton controller renvoie 409 avec message clair
        const msg = e?.response?.data?.message || e.message || "Failed to apply"
        if (e?.response?.status === 409) throw new Error(msg)
        this.error = msg
        throw e
      } finally {
        this.saving = false
      }
    },

    // Owner views applicants
    async fetchApplicants(jobId) {
      const auth = useAuthStore()
      if (!auth.token) return

      this.applicantsByJobId[jobId] = { loading: true, error: null, items: [] }
      try {
        const { data } = await api.get(`/jobs/${jobId}/applications`)
        this.applicantsByJobId[jobId] = {
          loading: false,
          error: null,
          items: Array.isArray(data) ? data : [],
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e.message || "Failed to load applicants"
        this.applicantsByJobId[jobId] = { loading: false, error: msg, items: [] }
        throw e
      }
    },
  },
})
