<script setup>
import { computed, onMounted, ref, watch } from "vue"
import { useJobsStore } from "../store/jobs"
import { useAuthStore } from "../store/auth"
import { COUNTRY_OPTIONS } from "../data/countries"

const jobsStore = useJobsStore()
const auth = useAuthStore()

const search = ref("")
const selectedCountry = ref("")
const selectedLocationType = ref("")
const selectedJobType = ref("")
const countries = COUNTRY_OPTIONS

const locationTypeOptions = [
  { value: "", label: "All location types" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
]

const jobTypeOptions = [
  { value: "", label: "All job types" },
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
]

const jobs = computed(() => jobsStore.jobs)
const loading = computed(() => jobsStore.loadingJobs)
const error = computed(() => jobsStore.error)
const saving = computed(() => jobsStore.saving)

const fetchJobsWithFilters = async () => {
  await jobsStore.fetchJobs({
    q: search.value,
    filters: {
      locationLabel: selectedCountry.value || undefined,
      locationType: selectedLocationType.value || undefined,
      jobType: selectedJobType.value || undefined,
    },
  })
}

onMounted(async () => {
  await fetchJobsWithFilters()
})

let t = null
watch([search, selectedCountry, selectedLocationType, selectedJobType], () => {
  clearTimeout(t)
  t = setTimeout(() => {
    fetchJobsWithFilters()
  }, 250)
})

const filteredJobs = computed(() =>
  jobs.value.filter((job) => {
    if (selectedCountry.value && (job.locationLabel || "") !== selectedCountry.value) return false
    if (selectedLocationType.value && (job.locationType || "") !== selectedLocationType.value) return false
    if (selectedJobType.value && (job.jobType || "") !== selectedJobType.value) return false
    return true
  }),
)

const resetFilters = async () => {
  search.value = ""
  selectedCountry.value = ""
  selectedLocationType.value = ""
  selectedJobType.value = ""
  await fetchJobsWithFilters()
}

const canApply = (job) => {
  // si backend renvoie ownerId, on bloque
  if (job.ownerId && auth.userUuid && job.ownerId === auth.userUuid) return false
  return true
}

const onApply = async (job) => {
  try {
    await jobsStore.applyToJob(job.id)
    alert("Applied ✅")
  } catch (e) {
    alert(e.message || "Apply failed")
  }
}

const formatJobLocation = (job) => {
  const type = job?.locationType || "remote"
  const country = job?.locationLabel || "Unknown country"
  return `${type} • ${country}`
}
</script>

<template>
  <section class="jobs">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Find a job</p>
        <h2>Explore jobs</h2>
        <p class="muted">Search by text, then filter by country, location type, and job type.</p>
      </div>

      <div class="search-grid">
        <input v-model="search" type="search" placeholder="Search by title, stack, company..." />
        <select v-model="selectedCountry" aria-label="Filter by country">
          <option value="">All countries</option>
          <option v-for="country in countries" :key="country.code" :value="country.label">
            {{ country.label }}
          </option>
        </select>
        <select v-model="selectedLocationType" aria-label="Filter by location type">
          <option v-for="opt in locationTypeOptions" :key="opt.value || 'all-location'" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <select v-model="selectedJobType" aria-label="Filter by job type">
          <option v-for="opt in jobTypeOptions" :key="opt.value || 'all-job'" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <button class="reset-btn" type="button" @click="resetFilters">Reset filters</button>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Loading...</p>

    <div v-if="filteredJobs.length" class="grid">
      <article v-for="job in filteredJobs" :key="job.id" class="card">
        <div class="card-head">
          <div class="info">
            <h3>{{ job.title }}</h3>
            <p class="muted">{{ job.companyName }}</p>
            <p class="sub">
              <span class="dot-sep">•</span>
              {{ formatJobLocation(job) }}
              <span class="dot-sep">•</span>
              {{ job.postedLabel || "—" }}
            </p>
          </div>

          <div class="badges">
            <span class="badge">{{ job.jobType }}</span>
          </div>
        </div>

        <p v-if="job.description" class="description">{{ job.description }}</p>

        <div class="tags" v-if="job.tags?.length">
          <span v-for="tag in job.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>

        <div class="footer">
          <div class="budget">
            <p class="label">Budget</p>
            <p class="value">{{ job.budgetLabel || "—" }}</p>
          </div>

          <div class="actions">
            <button class="apply-btn" type="button" :disabled="saving || !canApply(job)" @click="onApply(job)">
              Apply
            </button>
          </div>
        </div>
      </article>
    </div>

    <p v-else-if="!loading" class="empty">No jobs match these filters.</p>
  </section>
</template>


<style scoped>
.jobs {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.eyebrow {
  color: #8f9cb8;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
  font-weight: 800;
}

h2 {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-size: 17px;
  font-weight: 800;
}

.search-grid {
  display: grid;
  grid-template-columns: minmax(240px, 1.4fr) repeat(3, minmax(180px, 1fr)) auto;
  gap: 10px;
}

.search-grid input,
.search-grid select {
  background: rgba(8, 12, 24, 0.6);
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 12px;
  padding: 10px 12px;
  color: #e8f3ff;
}

.search-grid input:focus,
.search-grid select:focus {
  outline: none;
  border-color: rgba(120, 90, 255, 0.5);
  box-shadow: 0 0 0 1px rgba(120, 90, 255, 0.25);
}

.search-grid select option {
  background: #0a0f24;
  color: #e8f3ff;
}

.reset-btn {
  border: 1px solid rgba(120, 90, 255, 0.35);
  background: rgba(120, 90, 255, 0.12);
  color: #e8f3ff;
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
}

.reset-btn:hover {
  border-color: rgba(120, 90, 255, 0.5);
  background: rgba(120, 90, 255, 0.18);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.card {
  background: linear-gradient(160deg, rgba(8, 12, 24, 0.92), rgba(10, 17, 32, 0.9));
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 14px;
  padding: 16px;
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.32),
    0 0 18px rgba(120, 90, 255, 0.2);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-head {
  display: grid;
  gap: 15px;
  align-items: center;
}

.icon {
  height: 44px;
  width: 44px;
  border-radius: 14px;
  background: linear-gradient(145deg, rgba(106, 72, 255, 0.2), rgba(0, 198, 255, 0.16));
  display: grid;
  place-items: center;
  font-size: 22px;
  border: 1px solid rgba(120, 90, 255, 0.4);
}

.info h3 {
  color: #e5edff;
  font-size: 15px;
  font-weight: 700;
}

.muted {
  color: #7c8da8;
  font-size: 13px;
}

.sub {
  color: #6d7c92;
  font-size: 12px;
}

.description {
  color: #8a98b2;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-line;
  max-height: 120px;
  overflow: auto;
  word-break: break-word;
  overflow-wrap: anywhere;
  padding-right: 6px;
}

.dot {
  color: #1f3d52;
  margin: 0 4px;
}

.badges {
  display: flex;
  gap: 6px;
}

.badge {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
  justify-self: end;
}

.badge.full-time {
  color: #6ecbff;
  background: rgba(110, 203, 255, 0.14);
  border: 1px solid rgba(110, 203, 255, 0.5);
}

.badge.contract {
  color: #7bd38f;
  background: rgba(123, 211, 143, 0.18);
  border: 1px solid rgba(123, 211, 143, 0.45);
}

.badge.part-time {
  color: #f3c26b;
  background: rgba(243, 194, 107, 0.16);
  border: 1px solid rgba(243, 194, 107, 0.45);
}

.status-badge {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  text-transform: capitalize;
  border: 1px solid transparent;
}

.status-badge.en-attente {
  color: #b5becf;
  background: rgba(181, 190, 207, 0.14);
  border-color: rgba(181, 190, 207, 0.4);
}

.status-badge.en-cours {
  color: #6ecbff;
  background: rgba(110, 203, 255, 0.14);
  border-color: rgba(110, 203, 255, 0.5);
}

.status-badge.valide {
  color: #7bd38f;
  background: rgba(123, 211, 143, 0.18);
  border-color: rgba(123, 211, 143, 0.45);
}

.status-badge.litige {
  color: #ff9a9a;
  background: rgba(255, 107, 107, 0.16);
  border-color: rgba(255, 107, 107, 0.55);
}

.tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #d8e7ff;
  font-size: 12px;
  font-weight: 600;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.label {
  color: #6d7c92;
  font-size: 12px;
}

.value {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-weight: 800;
  display: inline-block;
}

.apply-btn {
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid rgba(120, 90, 255, 0.45);
  background: linear-gradient(90deg, rgba(106, 72, 255, 0.32), rgba(0, 198, 255, 0.32));
  color: #e9f2ff;
  font-weight: 800;
  cursor: pointer;
  box-shadow:
    0 12px 24px rgba(0, 102, 255, 0.2),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  transition: transform 0.1s ease, box-shadow 0.1s ease, border-color 0.1s ease;
}

.apply-btn:hover {
  transform: translateY(-1px);
  box-shadow:
    0 14px 32px rgba(0, 102, 255, 0.26),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.apply-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

.dispute-btn {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 107, 107, 0.55);
  background: rgba(255, 107, 107, 0.14);
  color: #ff9a9a;
  font-weight: 800;
  cursor: pointer;
}

.empty {
  color: #7c8da8;
}

.applied-badge {
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(120, 90, 255, 0.16);
  border: 1px solid rgba(120, 90, 255, 0.3);
  color: #e2dbff;
  font-weight: 700;
  font-size: 12px;
}

@media (max-width: 680px) {
  .search-grid {
    grid-template-columns: 1fr;
  }

  .footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
