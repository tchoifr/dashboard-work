<script setup>
import { reactive, ref, watch } from 'vue'

const props = defineProps({
  jobs: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['apply-job', 'start-applicant-conversation', 'reject-applicant', 'start-applicant-contract'])

const showForm = ref(false)
const newJob = reactive({
  title: '',
  company: '',
  location: 'Remote',
  posted: 'Today',
  type: 'Full-Time',
  status: 'En Attente',
  tagsInput: '',
  budget: '',
})

const localJobs = ref([...props.jobs])
const expandedApplicant = ref({})
const selectedCandidate = ref(null)
const selectedJob = ref(null)

watch(
  () => props.jobs,
  (incoming) => {
    localJobs.value = [...incoming]
  },
  { deep: true }
)

const statusClass = (status) => {
  if (!status) return ''
  const normalized = status.toLowerCase()
  if (normalized.includes('cours')) return 'en-cours'
  if (normalized.includes('attente')) return 'en-attente'
  if (normalized.includes('valid')) return 'valide'
  if (normalized.includes('litige')) return 'litige'
  return ''
}

const resetForm = () => {
  newJob.title = ''
  newJob.company = ''
  newJob.location = 'Remote'
  newJob.posted = 'Today'
  newJob.type = 'Full-Time'
  newJob.status = 'En Attente'
  newJob.tagsInput = ''
  newJob.budget = ''
}

const openForm = () => {
  resetForm()
  showForm.value = true
}

const closeForm = () => {
  showForm.value = false
}

const submitJob = () => {
  if (!newJob.title || !newJob.company || !newJob.budget) return
  const tags = newJob.tagsInput
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  localJobs.value = [
    {
      title: newJob.title,
      company: newJob.company,
      location: newJob.location,
      posted: newJob.posted,
      type: newJob.type,
      status: newJob.status,
      tags,
      budget: newJob.budget,
    },
    ...localJobs.value,
  ]

  closeForm()
}

const jobKey = (job) => job.id || `${job.company}-${job.title}`

const toggleApplicant = (job, candidate) => {
  selectedJob.value = job
  selectedCandidate.value = candidate
}

const isExpanded = () => false

const closeCandidateModal = () => {
  selectedCandidate.value = null
  selectedJob.value = null
}
</script>

<template>
  <section class="jobs">
    <div class="panel-header">
      <h2>Available Jobs</h2>
      <button class="primary-btn" type="button" @click="openForm">
        <span class="plus">+</span>
        Post Job
      </button>
    </div>

    <div class="grid">
      <article v-for="job in localJobs" :key="job.id || job.title" class="card">
        <div class="card-head">
          <div class="icon">📄</div>
          <div class="info">
            <h3>{{ job.title }}</h3>
            <p class="muted">{{ job.company }}</p>
            <p class="sub">
              <span class="dot">•</span> {{ job.location }}
              <span class="dot">•</span> {{ job.posted }}
            </p>
          </div>
          <div class="badges">
            <span class="badge" :class="job.type">{{ job.type }}</span>
            <span v-if="job.status" class="status-badge" :class="statusClass(job.status)">{{ job.status }}</span>
          </div>
        </div>

        <div class="tags">
          <span v-for="tag in job.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>

        <div class="footer">
          <div class="budget">
            <p class="label">Budget</p>
            <p class="value">{{ job.budget }}</p>
          </div>
        </div>

        <div v-if="job.applicants && job.applicants.length" class="applicants">
          <div class="applicants-head">
            <p class="label">Candidatures</p>
            <span class="count">{{ job.applicants.length }}</span>
          </div>
          <div class="applicants-list">
            <div v-for="candidate in job.applicants" :key="candidate?.id || candidate?.name" class="applicant-row">
              <div class="applicant-main">
                <p class="applicant-name">{{ candidate.name }}</p>
                <p class="muted small">{{ candidate.title }}</p>
              </div>
              <div class="applicant-actions">
                <button class="ghost-btn view-btn" type="button" @click="toggleApplicant(job, candidate)">
                  Voir profil
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>

    <div v-if="showForm" class="modal" @click.self="closeForm">
      <div class="modal-card">
        <header class="modal-head">
          <div>
            <p class="eyebrow">Nouveau job</p>
            <h3>Publier une offre</h3>
            <p class="muted">Ajoutez les infos principales pour rendre votre offre visible.</p>
          </div>
          <button class="close-btn" type="button" @click="closeForm">×</button>
        </header>

        <form class="form" @submit.prevent="submitJob">
          <div class="two-col">
            <label class="field">
              <span>Titre</span>
              <input v-model="newJob.title" type="text" placeholder="Ex: Senior Web3 Developer" required />
            </label>
            <label class="field">
              <span>Entreprise / Client</span>
              <input v-model="newJob.company" type="text" placeholder="Ex: DeFi Protocol" required />
            </label>
          </div>
          <div class="two-col">
            <label class="field">
              <span>Localisation</span>
              <input v-model="newJob.location" type="text" placeholder="Remote" />
            </label>
            <label class="field">
              <span>Date de publication</span>
              <input v-model="newJob.posted" type="text" placeholder="Today" />
            </label>
          </div>
          <div class="two-col">
            <label class="field">
              <span>Type</span>
              <select v-model="newJob.type">
                <option>Full-Time</option>
                <option>Part-Time</option>
                <option>Contract</option>
              </select>
            </label>
            <label class="field">
              <span>Statut</span>
              <select v-model="newJob.status">
                <option>En Attente</option>
                <option>En Cours</option>
                <option>Valide</option>
                <option>Litige</option>
              </select>
            </label>
          </div>
          <label class="field">
            <span>Budget</span>
            <input v-model="newJob.budget" type="text" placeholder="8,000-12,000 USDC/month" required />
          </label>
          <label class="field">
            <span>Tags</span>
            <input v-model="newJob.tagsInput" type="text" placeholder="Solidity, React, Web3.js" />
            <small>Séparez les tags par des virgules.</small>
          </label>

          <div class="form-actions">
            <button class="ghost-btn" type="button" @click="closeForm">Annuler</button>
            <button class="primary-btn" type="submit" :disabled="!newJob.title || !newJob.company || !newJob.budget">
              Créer le job
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="selectedCandidate" class="candidate-overlay" @click.self="closeCandidateModal">
      <div class="candidate-card">
        <header class="modal-head">
          <div>
            <p class="eyebrow">Profil candidat</p>
            <h3>{{ selectedCandidate.name }}</h3>
            <p class="muted">{{ selectedCandidate.title }}</p>
          </div>
          <button class="close-btn" type="button" @click="closeCandidateModal">×</button>
        </header>

        <div class="candidate-preview">
          <div class="summary-top">
            <span class="chip">Rate: {{ selectedCandidate.profile?.rate || selectedCandidate.rate }}</span>
            <span class="chip">Disponibilité: {{ selectedCandidate.profile?.availability || selectedCandidate.availability }}</span>
            <span v-if="selectedCandidate.profile?.location" class="chip">Location: {{ selectedCandidate.profile.location }}</span>
          </div>
          <p class="muted summary-bio">
            {{ selectedCandidate.profile?.bio || selectedCandidate.bio || 'Profil candidat' }}
          </p>

          <div class="summary-section">
            <div class="section-head">
              <p class="label">Core Skills</p>
            </div>
            <div class="tags">
              <span
                v-for="skill in selectedCandidate.profile?.skills || selectedCandidate.skills || []"
                :key="skill"
                class="tag"
              >
                {{ skill }}
              </span>
            </div>
          </div>

          <div
            v-if="(selectedCandidate.profile?.highlights || selectedCandidate.highlights || []).length"
            class="summary-section"
          >
            <div class="section-head">
              <p class="label">Highlights</p>
            </div>
            <ul class="summary-list">
              <li
                v-for="item in selectedCandidate.profile?.highlights || selectedCandidate.highlights || []"
                :key="item"
              >
                {{ item }}
              </li>
            </ul>
          </div>

          <div
            v-if="(selectedCandidate.profile?.portfolio || selectedCandidate.portfolio || []).length"
            class="summary-section"
          >
            <div class="section-head">
              <p class="label">Portfolio</p>
            </div>
            <div class="portfolio">
              <div
                v-for="item in selectedCandidate.profile?.portfolio || selectedCandidate.portfolio || []"
                :key="item.label"
                class="portfolio-item"
              >
                <p class="portfolio-title">{{ item.label }}</p>
                <p class="muted small">{{ item.tech }}</p>
                <a class="link" :href="item.link || '#'">View</a>
              </div>
            </div>
          </div>

          <div v-if="selectedCandidate.note" class="candidate-note">
            {{ selectedCandidate.note }}
          </div>
        </div>

        <div class="detail-actions">
          <button class="ghost-btn" type="button" @click="emit('reject-applicant', { job: selectedJob, applicant: selectedCandidate })">
            Refuser
          </button>
          <button class="primary-btn compact" type="button" @click="emit('start-applicant-contract', { job: selectedJob, applicant: selectedCandidate })">
            Démarrer contrat
          </button>
          <button class="ghost-btn" type="button" @click="emit('start-applicant-conversation', { job: selectedJob, applicant: selectedCandidate })">
            Démarrer conv.
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
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
  background: rgba(120, 90, 255, 0.45);
  border-radius: 8px;
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
</style>
