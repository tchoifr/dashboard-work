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
  listReceivedApplications,
  manageJobApplication,
  addApplicantAsFriend,
  deleteJobApplication,
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
      : typeof job.applicationsCount === "number"
        ? job.applicationsCount
      : Array.isArray(job.applicants)
        ? job.applicants.length
        : Array.isArray(job.applications)
          ? job.applications.length
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
    ownerId: job.ownerId || job.owner?.uuid || null,
  }
}

const asArray = (v) => (Array.isArray(v) ? v : [])
const defaultReceivedApplicationsState = () => ({
  loading: false,
  error: null,
  items: [],
  total: 0,
  status: null,
})

const normalizeReceivedApplication = (item) => {
  if (!item) return null

  const applicant = item.applicant || {}
  const profile = applicant.profile || {}

  return {
    id: item.id,
    status: item.status || "applied",
    createdAt: item.createdAt || null,
    appliedAtLabel: toIsoLabel(item.createdAt),
    job: {
      id: item.job?.id,
      title: item.job?.title || "",
      companyName: item.job?.companyName || "",
    },
    applicant: {
      uuid: applicant.uuid || null,
      username: applicant.username || "",
      walletAddress: applicant.walletAddress || "",
      title: applicant.title || profile.title || "",
      location: applicant.location || profile.location || "",
      availability: applicant.availability || profile.availability || "",
      rateHourlyUsd: applicant.rateHourlyUsd ?? null,
      rate: profile.rate ?? null,
      bio: applicant.bio || profile.bio || "",
      skills: asArray(applicant.skills).length ? asArray(applicant.skills) : asArray(profile.skills),
      highlights: asArray(applicant.highlights).length
        ? asArray(applicant.highlights)
        : asArray(profile.highlights),
      portfolio: asArray(applicant.portfolio).length
        ? asArray(applicant.portfolio)
        : asArray(profile.portfolio),
      profile,
    },
  }
}

const normalizeJobApplicant = (item) => {
  if (!item) return null

  const appId = item.id ?? item.applicationId ?? null
  const applicant = item.applicant || {}

  return {
    ...item,
    id: appId,
    applicationId: appId,
    userId: item.userId || applicant.uuid || item.uuid || null,
    username: item.username || applicant.username || item.name || "",
    walletAddress: item.walletAddress || applicant.walletAddress || "",
    title: item.title || applicant.title || "",
    location: item.location || applicant.location || "",
    availability: item.availability || applicant.availability || "",
    rateHourlyUsd: item.rateHourlyUsd ?? applicant.rateHourlyUsd ?? null,
    bio: item.bio || applicant.bio || "",
    skills: asArray(item.skills).length ? asArray(item.skills) : asArray(applicant.skills),
    highlights: asArray(item.highlights).length ? asArray(item.highlights) : asArray(applicant.highlights),
    portfolio: asArray(item.portfolio).length ? asArray(item.portfolio) : asArray(applicant.portfolio),
    profile: item.profile || applicant.profile || null,
  }
}

const enrichApplicantsFromReceived = (applicants, receivedItems, jobId) => {
  const byId = new Map()
  const byUuid = new Map()

  for (const rec of receivedItems || []) {
    if (Number(rec?.job?.id) !== Number(jobId)) continue
    if (rec?.id != null) byId.set(String(rec.id), rec)
    if (rec?.applicant?.uuid) byUuid.set(String(rec.applicant.uuid), rec)
  }

  return (applicants || []).map((raw) => {
    const item = normalizeJobApplicant(raw)
    if (!item) return raw

    const recById = item.id != null ? byId.get(String(item.id)) : null
    const recByUuid = item.userId ? byUuid.get(String(item.userId)) : null
    const rec = recById || recByUuid
    if (!rec) return item

    return {
      ...item,
      id: item.id ?? rec.id,
      applicationId: item.applicationId ?? rec.id,
      status: item.status || rec.status,
      createdAt: item.createdAt || rec.createdAt,
      userId: item.userId || rec.applicant?.uuid || null,
      username: item.username || rec.applicant?.username || "",
      title: item.title || rec.applicant?.title || rec.applicant?.profile?.title || "",
      location: item.location || rec.applicant?.location || rec.applicant?.profile?.location || "",
      availability:
        item.availability || rec.applicant?.availability || rec.applicant?.profile?.availability || "",
      rateHourlyUsd: item.rateHourlyUsd ?? rec.applicant?.rateHourlyUsd ?? null,
      bio: item.bio || rec.applicant?.bio || rec.applicant?.profile?.bio || "",
      skills: asArray(item.skills).length
        ? asArray(item.skills)
        : asArray(rec.applicant?.skills).length
          ? asArray(rec.applicant?.skills)
          : asArray(rec.applicant?.profile?.skills),
      highlights: asArray(item.highlights).length
        ? asArray(item.highlights)
        : asArray(rec.applicant?.highlights).length
          ? asArray(rec.applicant?.highlights)
          : asArray(rec.applicant?.profile?.highlights),
      portfolio: asArray(item.portfolio).length
        ? asArray(item.portfolio)
        : asArray(rec.applicant?.portfolio).length
          ? asArray(rec.applicant?.portfolio)
          : asArray(rec.applicant?.profile?.portfolio),
      profile: item.profile || rec.applicant?.profile || null,
      applicant: {
        ...(item.applicant || {}),
        ...(rec.applicant || {}),
      },
    }
  })
}

export const useJobsStore = defineStore("jobs", {
  state: () => ({
    myJobs: [],
    loadingMine: false,

    jobs: [],
    jobsMeta: { page: 1, limit: 20, total: 0, sort: "recent", q: "" },
    loadingJobs: false,

    applicantsByJobId: {},

    receivedApplications: defaultReceivedApplicationsState(),

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
      this.receivedApplications = defaultReceivedApplicationsState()
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
        const baseItems = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
        let items = baseItems.map(normalizeJobApplicant).filter(Boolean)

        // Enrichit avec le endpoint owner qui contient applicant.profile complet
        try {
          const received = await listReceivedApplications()
          const receivedItems = Array.isArray(received?.items)
            ? received.items.map(normalizeReceivedApplication).filter(Boolean)
            : []
          items = enrichApplicantsFromReceived(items, receivedItems, jobId)
        } catch {
          // On garde la liste minimale si l’enrichissement échoue
        }

        this.applicantsByJobId[jobId] = {
          loading: false,
          error: null,
          items,
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e.message || "Failed to load applicants"
        this.applicantsByJobId[jobId] = { loading: false, error: msg, items: [] }
        throw e
      }
    },

    async fetchReceivedApplications(status = null) {
      const auth = useAuthStore()
      if (!auth.token) return

      if (!this.receivedApplications) {
        this.receivedApplications = defaultReceivedApplicationsState()
      }

      this.receivedApplications = {
        ...this.receivedApplications,
        loading: true,
        error: null,
        status,
      }

      try {
        const data = await listReceivedApplications(status ? { status } : {})
        const rawItems = Array.isArray(data?.items) ? data.items : []
        const items = rawItems.map(normalizeReceivedApplication).filter(Boolean)

        this.receivedApplications = {
          loading: false,
          error: null,
          items,
          total: Number.isFinite(data?.total) ? data.total : items.length,
          status,
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e.message || "Failed to load received applications"
        this.receivedApplications = {
          ...this.receivedApplications,
          loading: false,
          error: msg,
          items: [],
          total: 0,
          status,
        }
        throw e
      }
    },

    async manageReceivedApplication(jobId, applicationId, status) {
      const auth = useAuthStore()
      if (!auth.token) return

      if (!this.receivedApplications) {
        this.receivedApplications = defaultReceivedApplicationsState()
      }

      this.saving = true
      try {
        const updated = await manageJobApplication(jobId, applicationId, status)
        const targetId = updated?.id ?? applicationId

        this.receivedApplications = {
          ...this.receivedApplications,
          items: this.receivedApplications.items.map((item) =>
            item.id === targetId ? { ...item, status: updated?.status || status } : item,
          ),
        }

        return updated
      } finally {
        this.saving = false
      }
    },

    async addReceivedApplicantAsFriend(jobId, applicationId) {
      const auth = useAuthStore()
      if (!auth.token) return null

      return addApplicantAsFriend(jobId, applicationId)
    },

    async manageJobApplicant(jobId, applicationId, status, options = {}) {
      const auth = useAuthStore()
      if (!auth.token) return

      this.saving = true
      try {
        const updated = await manageJobApplication(jobId, applicationId, status)
        const targetId = updated?.id ?? applicationId
        const state = this.applicantsByJobId[jobId] || { loading: false, error: null, items: [] }

        const nextItems = (state.items || [])
          .map((item) => {
            const itemId = item?.id ?? item?.applicationId
            return itemId === targetId ? { ...item, status: updated?.status || status } : item
          })
          .filter((item) => !(options?.removeRejected && String(item?.status || "").toLowerCase() === "rejected"))

        this.applicantsByJobId[jobId] = { ...state, items: nextItems }

        return updated
      } finally {
        this.saving = false
      }
    },

    async deleteJobApplicant(jobId, applicationId) {
      const auth = useAuthStore()
      if (!auth.token) return

      this.saving = true
      try {
        await deleteJobApplication(jobId, applicationId)
        const state = this.applicantsByJobId[jobId] || { loading: false, error: null, items: [] }
        this.applicantsByJobId[jobId] = {
          ...state,
          items: (state.items || []).filter((item) => {
            const itemId = item?.id ?? item?.applicationId
            return itemId !== applicationId
          }),
        }
      } finally {
        this.saving = false
      }
    },
  },
})
