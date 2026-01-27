<script setup>
import { computed, onMounted, reactive, ref } from "vue"
import { useJobsStore } from "../store/jobs"

const jobsStore = useJobsStore()

const showForm = ref(false)
const showApplicantsFor = ref(null) // jobId

const form = reactive({
  title: "",
  companyName: "",
  locationType: "remote",
  locationLabel: "",
  jobType: "contract",
  budgetLabel: "",
  description: "",
  tagsInput: "",
})

const loading = computed(() => jobsStore.loadingMine)
const saving = computed(() => jobsStore.saving)
const error = computed(() => jobsStore.error)
const myJobs = computed(() => jobsStore.myJobs)

onMounted(async () => {
  await jobsStore.fetchMine()
})

const resetForm = () => {
  form.title = ""
  form.companyName = ""
  form.locationType = "remote"
  form.locationLabel = ""
  form.jobType = "contract"
  form.budgetLabel = ""
  form.description = ""
  form.tagsInput = ""
}

const openForm = () => {
  resetForm()
  showForm.value = true
}
const closeForm = () => (showForm.value = false)

const parseTags = (input) =>
  input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

const submitJob = async () => {
  if (!form.title || !form.companyName) return

  const payload = {
    title: form.title.trim(),
    companyName: form.companyName.trim(),
    locationType: form.locationType,
    locationLabel: form.locationLabel.trim() || null,
    jobType: form.jobType,
    budgetLabel: form.budgetLabel.trim() || null,
    description: form.description.trim(),
    tags: parseTags(form.tagsInput),
  }

  try {
    await jobsStore.createJob(payload)
    closeForm()
  } catch (e) {
    alert(e?.response?.data?.message || e.message || "Create failed")
  }
}

// ✅ 2 états UI seulement : published => vert, sinon rouge
const statusLabel = (job) => {
  const s = (job?.status || "").toLowerCase()
  return s === "published" ? "Published" : "Rejected"
}
const dotClass = (job) => {
  const s = (job?.status || "").toLowerCase()
  return s === "published" ? "dot green" : "dot red"
}

const onPublish = async (job) => {
  try {
    await jobsStore.publishJob(job.id)
  } catch (e) {
    alert(e?.response?.data?.message || e.message || "Publish failed")
  }
}
const onWithdraw = async (job) => {
  try {
    await jobsStore.withdrawJob(job.id)
  } catch (e) {
    alert(e?.response?.data?.message || e.message || "Withdraw failed")
  }
}
const onDelete = async (job) => {
  if (!confirm("Delete this job?")) return
  try {
    await jobsStore.deleteJob(job.id)
  } catch (e) {
    alert(e?.response?.data?.message || e.message || "Delete failed")
  }
}

const openApplicants = async (job) => {
  showApplicantsFor.value = job.id
  try {
    await jobsStore.fetchApplicants(job.id)
  } catch {
    // error déjà stocké dans applicantsState
  }
}
const closeApplicants = () => {
  showApplicantsFor.value = null
}

const applicantsState = computed(() => {
  const jobId = showApplicantsFor.value
  if (!jobId) return { loading: false, error: null, items: [] }
  return jobsStore.applicantsState(jobId)
})
</script>

<template>
  <section class="jobs">
    <div class="panel-header">
      <div>
        <p class="eyebrow">My Jobs</p>
        <h2>Your job postings</h2>
        <p class="muted">Create, publish, withdraw, and manage your jobs.</p>
      </div>

      <button class="primary-btn" type="button" @click="openForm">
        <span class="plus">+</span>
        Create Job
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Loading...</p>

    <div v-if="myJobs.length" class="grid">
      <article v-for="job in myJobs" :key="job.id" class="card">
        <div class="card-head">
          <div class="info">
            <div class="title-row">
              <span :class="dotClass(job)" aria-hidden="true"></span>
              <span class="status-text">{{ statusLabel(job) }}</span>

              <button
                v-if="job.applicantsCount > 0"
                class="notif"
                type="button"
                @click="openApplicants(job)"
                title="View applicants"
              >
                {{ job.applicantsCount }}
              </button>
            </div>

            <h3>{{ job.title }}</h3>
            <p class="muted">{{ job.companyName }}</p>

            <p class="sub">
              <span class="dot-sep">•</span>
              {{ job.locationType }}<span v-if="job.locationLabel"> ({{ job.locationLabel }})</span>
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
            <!-- ✅ publish si pas published -->
            <button
              v-if="(job.status || '').toLowerCase() !== 'published'"
              class="primary-btn compact"
              type="button"
              :disabled="saving"
              @click="onPublish(job)"
            >
              Publish
            </button>

            <!-- ✅ withdraw si published -->
            <button
              v-else
              class="primary-btn compact"
              type="button"
              :disabled="saving"
              @click="onWithdraw(job)"
            >
              Withdraw
            </button>

            <button class="danger-btn compact" type="button" :disabled="saving" @click="onDelete(job)">
              Delete
            </button>

            <button
              v-if="job.applicantsCount > 0"
              class="ghost-btn compact"
              type="button"
              @click="openApplicants(job)"
            >
              View applicants
            </button>
          </div>
        </div>
      </article>
    </div>

    <p v-else-if="!loading" class="empty">No jobs yet.</p>

    <!-- Modal create -->
    <div v-if="showForm" class="modal" @click.self="closeForm">
      <div class="modal-card">
        <header class="modal-head">
          <div>
            <p class="eyebrow">New job</p>
            <h3>Create a job posting</h3>
            <p class="muted">It will be private until you publish it.</p>
          </div>
          <button class="close-btn" type="button" @click="closeForm">×</button>
        </header>

        <form class="form" @submit.prevent="submitJob">
          <div class="two-col">
            <label class="field">
              <span>Title</span>
              <input v-model="form.title" type="text" placeholder="e.g. Senior Web3 Developer" required />
            </label>

            <label class="field">
              <span>Company</span>
              <input v-model="form.companyName" type="text" placeholder="e.g. DeFi Protocol" required />
            </label>
          </div>

          <div class="two-col">
            <label class="field">
              <span>Location type</span>
              <select v-model="form.locationType">
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </label>

            <label class="field">
              <span>Location label (optional)</span>
              <input v-model="form.locationLabel" type="text" placeholder="e.g. Paris" />
            </label>
          </div>

          <div class="two-col">
            <label class="field">
              <span>Job type</span>
              <select v-model="form.jobType">
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="freelance">Freelance</option>
              </select>
            </label>

            <label class="field">
              <span>Budget (free text)</span>
              <input
                v-model="form.budgetLabel"
                type="text"
                placeholder="e.g. 8000 USDC / month, or 500/day, or Negotiable"
              />
            </label>
          </div>

          <div class="two-col">
            <label class="field">
              <span>Tags</span>
              <input v-model="form.tagsInput" type="text" placeholder="Solidity, React, Web3" />
              <small>Comma-separated.</small>
            </label>
          </div>

          <label class="field">
            <span>Description</span>
            <textarea v-model="form.description" rows="4" placeholder="Describe the role..."></textarea>
          </label>

          <div class="form-actions">
            <button class="ghost-btn" type="button" @click="closeForm">Cancel</button>
            <button class="primary-btn" type="submit" :disabled="saving || !form.title || !form.companyName">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Applicants -->
    <div v-if="showApplicantsFor" class="modal" @click.self="closeApplicants">
      <div class="modal-card">
        <header class="modal-head">
          <div>
            <p class="eyebrow">Applicants</p>
            <h3>People who applied</h3>
            <p class="muted">You can contact them after.</p>
          </div>
          <button class="close-btn" type="button" @click="closeApplicants">×</button>
        </header>

        <div class="modal-body">
          <p v-if="applicantsState.loading" class="muted">Loading applicants...</p>
          <p v-else-if="applicantsState.error" class="error">{{ applicantsState.error }}</p>

          <div v-else-if="applicantsState.items.length">
            <article v-for="a in applicantsState.items" :key="a.userId" class="applicant">
              <div class="row">
                <strong>{{ a.username || a.walletAddress || a.userId }}</strong>
                <span class="badge">{{ a.status }}</span>
              </div>
              <p class="muted small">{{ a.walletAddress }}</p>
              <p class="muted small">Applied: {{ new Date(a.createdAt).toLocaleString() }}</p>
            </article>
          </div>

          <p v-else class="muted">No applicants yet.</p>
        </div>
      </div>
    </div>
  </section>
</template>


<style scoped>

.notif {
  margin-left: 10px;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  font-size: 12px;
  border: 0;
  cursor: pointer;
}
.dot.gray { opacity: 0.5; }
.small { font-size: 12px; }
.applicant { padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
.row { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
.jobs {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

h2 {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-size: 17px;
  font-weight: 800;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(120, 90, 255, 0.4);
  background: linear-gradient(90deg, #6a48ff, #00c6ff);
  color: #061227;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 12px 28px rgba(0, 102, 255, 0.25);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 32px rgba(0, 102, 255, 0.32);
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.danger-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  padding: 10px 14px;
  border-radius: 12px;

  border: 1px solid rgba(255, 80, 80, 0.45);
  background: linear-gradient(90deg, #ff4d4d, #ff1f6a);

  color: #2a0606;
  font-weight: 800;
  cursor: pointer;

  box-shadow: 0 12px 28px rgba(255, 60, 60, 0.28);

  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.danger-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 32px rgba(255, 60, 60, 0.38);
}

.danger-btn:active {
  transform: translateY(0);
}

.danger-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.plus {
  font-size: 16px;
  line-height: 1;
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
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid rgba(120, 90, 255, 0.4);
  background: rgba(120, 90, 255, 0.12);
  color: #e2dbff;
  font-weight: 700;
  cursor: pointer;
}

.apply-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}

.dispute-btn {
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 107, 107, 0.55);
  background: rgba(255, 107, 107, 0.14);
  color: #ff9a9a;
  font-weight: 800;
  cursor: pointer;
}

.dispute-btn.reject {
  border-color: rgba(255, 107, 107, 0.45);
  background: rgba(255, 107, 107, 0.12);
}

.owner-pill {
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(120, 90, 255, 0.14);
  border: 1px solid rgba(120, 90, 255, 0.35);
  color: #e2dbff;
  font-weight: 800;
  font-size: 12px;
}

.applicants {
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 12px;
  padding: 10px;
  background: rgba(7, 12, 24, 0.78);
  display: grid;
  gap: 10px;
}

.applicants-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.count {
  padding: 4px 8px;
  border-radius: 10px;
  background: rgba(120, 90, 255, 0.16);
  color: #e2dbff;
  font-weight: 700;
  font-size: 12px;
}

.applicants-list {
  display: grid;
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
}

.applicants-list::-webkit-scrollbar {
  width: 8px;
}

.applicants-list::-webkit-scrollbar-thumb {
  background-image: linear-gradient(180deg, #6b1dff 0%, #2d82ff 100%);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.applicant-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(120, 90, 255, 0.2);
  background: rgba(255, 255, 255, 0.03);
}

.applicant-main {
  display: grid;
  gap: 2px;
}

.applicant-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ghost-btn.view-btn {
  background: linear-gradient(90deg, #6a48ff, #00c6ff);
  border-color: transparent;
  color: #061227;
  font-weight: 800;
  box-shadow:
    0 10px 18px rgba(0, 102, 255, 0.25),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.applicant-name {
  color: #e5edff;
  font-weight: 700;
}

.small {
  font-size: 12px;
}

.applicant-details {
  border: 1px solid rgba(120, 90, 255, 0.3);
  border-radius: 12px;
  padding: 12px;
  background: linear-gradient(160deg, rgba(8, 12, 24, 0.92), rgba(10, 17, 32, 0.9));
  box-shadow:
    0 12px 26px rgba(0, 0, 0, 0.32),
    0 0 18px rgba(120, 90, 255, 0.2);
  display: grid;
  gap: 6px;
  margin-top: 6px;
}

.detail-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.primary-btn.compact {
  padding: 8px 12px;
  border-radius: 12px;
}

.note {
  color: #c5d5ec;
  font-size: 12px;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 16, 0.72);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 20;
}

.modal-card {
  width: min(540px, 100%);
  background: linear-gradient(165deg, rgba(7, 10, 24, 0.96), rgba(10, 18, 36, 0.94));
  border: 1px solid rgba(120, 90, 255, 0.3);
  border-radius: 18px;
  box-shadow:
    0 24px 44px rgba(0, 0, 0, 0.45),
    0 0 28px rgba(120, 90, 255, 0.3);
  padding: 18px;
  color: #dfe7ff;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.modal-head h3 {
  font-size: 16px;
  color: #eae7ff;
  margin: 0;
}

.close-btn {
  height: 32px;
  width: 32px;
  border-radius: 50%;
  border: 1px solid rgba(120, 90, 255, 0.35);
  background: rgba(120, 90, 255, 0.1);
  color: #d6c7ff;
  cursor: pointer;
  font-size: 14px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #9fb0cc;
}

.field span {
  font-weight: 700;
  color: #dfe7ff;
}

.field input,
.field textarea,
.field select {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(120, 90, 255, 0.28);
  border-radius: 12px;
  padding: 10px 12px;
  color: #eae7ff;
  font-size: 14px;
}

.field select {
  cursor: pointer;
}

.field input::placeholder {
  color: #6f7c96;
}

.field select option {
  background: #0a0f1f;
  color: #eae7ff;
}

.field small {
  color: #7c8da8;
}

.two-col {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.ghost-btn {
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #dfe7ff;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 680px) {
  .footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .applicant-actions {
    justify-content: flex-start;
  }
}

.candidate-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 16, 0.78);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 40;
}

.candidate-card {
  width: min(620px, 100%);
  background: radial-gradient(circle at 20% 20%, rgba(120, 90, 255, 0.14), rgba(0, 198, 255, 0)),
    linear-gradient(165deg, rgba(7, 10, 24, 0.96), rgba(10, 18, 36, 0.94));
  border: 1px solid rgba(120, 90, 255, 0.35);
  border-radius: 18px;
  box-shadow:
    0 24px 44px rgba(0, 0, 0, 0.5),
    0 0 28px rgba(120, 90, 255, 0.32);
  padding: 18px;
  color: #dfe7ff;
  display: grid;
  gap: 12px;
}

.candidate-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.meta-block {
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
}

.candidate-note {
  border: 1px dashed rgba(120, 90, 255, 0.3);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  color: #c5d5ec;
}

.candidate-summary {
  display: grid;
  gap: 10px;
}

.summary-top {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  background: rgba(120, 90, 255, 0.14);
  border: 1px solid rgba(120, 90, 255, 0.35);
  color: #e2dbff;
  padding: 6px 10px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 13px;
}

.summary-bio {
  color: #c5d5ec;
  margin: 0;
}

.summary-section {
  display: grid;
  gap: 6px;
}

.summary-list {
  margin: 0;
  padding-left: 16px;
  color: #c5d5ec;
  display: grid;
  gap: 4px;
}

.portfolio {
  display: grid;
  gap: 10px;
}

.portfolio-item {
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.28);
}

.portfolio-title {
  color: #eae7ff;
  font-weight: 700;
  margin: 0 0 2px;
}



/* --- status dot (🟢 / 🔴) --- */
.title-row{
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.dot{
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
  box-shadow: 0 0 12px rgba(255,255,255,0.15);
}

.dot.green{
  background: #2ecc71; /* green */
  box-shadow: 0 0 14px rgba(46, 204, 113, 0.45);
}

.dot.red{
  background: #ff4d4f; /* red */
  box-shadow: 0 0 14px rgba(255, 77, 79, 0.45);
}

.status-text{
  font-size: 0.9rem;
  font-weight: 600;
  opacity: 0.95;
}
</style>
