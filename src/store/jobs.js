// src/store/jobs.js
import { defineStore } from "pinia"
import {
  createJob as createJobApi,
  listMyJobs,
  listJobs,
  updateJob as updateJobApi,
  deleteJob as deleteJobApi,
  publishJob as publishJobApi,
  withdrawJob as withdrawJobApi,
  applyToJob as applyToJobApi,
  listJobApplications,
} from "../services/jobsApi"
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

    status: job.status ?? null,
    rejectedReason: job.rejectedReason ?? null,
    createdAt: job.createdAt ?? null,
    publishedAt: job.publishedAt ?? null,

    postedLabel: toIsoLabel(job.publishedAt || job.createdAt),
    isPublic: job.status === "published",
    applicantsCount,
  }
}

export const useJobsStore = defineStore("jobs", {
  state: () => ({
    myJobs: [],
    loadingMine: false,

    jobs: [],
    jobsMeta: { page: 1, limit: 20, total: 0, sort: "recent", q: "" },
    loadingJobs: false,

    applicantsByJobId: {},

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

    // ✅ helper réactif: remplace l’objet dans le tableau
    upsertMyJob(updated) {
      if (!updated?.id) return
      const idx = this.myJobs.findIndex((j) => j.id === updated.id)
      if (idx === -1) {
        this.myJobs = [updated, ...this.myJobs]
        return
      }
      // IMPORTANT: remplacement par une nouvelle ref -> update UI immédiat
      this.myJobs = this.myJobs.map((j) => (j.id === updated.id ? updated : j))
    },

    async fetchMine() {
      const auth = useAuthStore()
      if (!auth.token) return

      this.loadingMine = true
      this.error = null
      try {
        const data = await listMyJobs()
        this.myJobs = Array.isArray(data) ? data.map(normalizeJob) : []
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to load my jobs"
        console.error("jobs.fetchMine failed", e?.response?.status, e?.response?.data || e)
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
        const data = await listJobs({
          q: q || undefined,
          page,
          limit,
          sort,
          ...(params.filters || {}),
        })

        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
        this.jobs = items.map(normalizeJob)

        if (data?.items) {
          this.jobsMeta = {
            page: data?.page ?? page,
            limit: data?.limit ?? limit,
            total: data?.total ?? 0,
            sort,
            q,
          }
        } else {
          this.jobsMeta = { ...this.jobsMeta, page, limit, sort, q }
        }
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to load jobs"
        console.error("jobs.fetchJobs failed", e?.response?.status, e?.response?.data || e)
        this.jobs = []
      } finally {
        this.loadingJobs = false
      }
    },

    async createJob(payloadFromUi) {
      const auth = useAuthStore()
      if (!auth.token) return

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
        const data = await createJobApi(payload)
        const created = normalizeJob(data)
        this.upsertMyJob(created)
        return created
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to create job"
        console.error("jobs.createJob failed", e?.response?.status, e?.response?.data || e)
        throw e
      } finally {
        this.saving = false
      }
    },

    async updateJob(id, patchFromUi) {
      const auth = useAuthStore()
      if (!auth.token) return

      const patch = { ...patchFromUi }

      this.saving = true
      this.error = null
      try {
        const data = await updateJobApi(id, patch)
        const updated = normalizeJob(data)
        this.upsertMyJob(updated)
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
        await deleteJobApi(id)
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
        const data = await publishJobApi(id)

        // Certaines API renvoient 204/empty body -> on met à jour localement
        let updated = normalizeJob(data)
        if (!updated) {
          const existing = this.myJobs.find((j) => j.id === id)
          if (existing) {
            updated = normalizeJob({
              ...existing,
              status: "published",
              publishedAt: existing.publishedAt || new Date().toISOString(),
            })
          }
        }

        if (updated) this.upsertMyJob(updated)
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
        const data = await withdrawJobApi(id)

        // Même logique que publish: fallback si réponse vide
        let updated = normalizeJob(data)
        if (!updated) {
          const existing = this.myJobs.find((j) => j.id === id)
          if (existing) {
            updated = normalizeJob({
              ...existing,
              status: "draft",
              publishedAt: null,
            })
          }
        }

        if (updated) this.upsertMyJob(updated)
        return updated
      } catch (e) {
        this.error = e?.response?.data?.message || e.message || "Failed to withdraw job"
        console.error("jobs.withdrawJob failed", e?.response?.status, e?.response?.data || e)
        throw e
      } finally {
        this.saving = false
      }
    },

    async applyToJob(jobId) {
      const auth = useAuthStore()
      if (!auth.token) return

      this.saving = true
      this.error = null
      try {
        const data = await applyToJobApi(jobId)
        return data
      } catch (e) {
        const status = e?.response?.status
        const msg = e?.response?.data?.message || e.message || "Failed to apply"
        if (status === 409) throw new Error(msg)
        this.error = msg
        throw e
      } finally {
        this.saving = false
      }
    },

    async fetchApplicants(jobId) {
      const auth = useAuthStore()
      if (!auth.token) return

      this.applicantsByJobId[jobId] = { loading: true, error: null, items: [] }

      try {
        const data = await listJobApplications(jobId)
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
