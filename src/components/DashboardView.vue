<script setup>
import { ref } from 'vue'
import OverviewSection from './OverviewSection.vue'
import ContractsSection from './ContractsSection.vue'
import JobsSection from './JobsSection.vue'
import RechargerJobsSection from './RechargerJobsSection.vue'
import MessagesSection from './MessagesSection.vue'
import ProfileSection from './ProfileSection.vue'
import DaoDisputesSection from './DaoDisputesSection.vue'
import {
  summaryCards,
  overviewData,
  contractData,
  jobData,
  messagesData,
  profileData,
  daoDisputes,
} from '../store/dashboardData'

const tabs = ['Overview', 'Contracts', 'My Jobs', 'Find a job', 'DAO', 'Messages', 'Profile']
const activeTab = ref('Overview')
const profile = ref(JSON.parse(JSON.stringify(profileData)))
const normalizeJob = (job) => ({ applied: false, ...job })
const jobs = ref(jobData.map((job) => normalizeJob(job)))
const conversations = ref(messagesData.conversations.map((c) => ({ ...c })))
const threads = ref(
  Object.fromEntries(
    Object.entries(messagesData.threads || {}).map(([name, list]) => [name, list.map((msg) => ({ ...msg }))])
  )
)
const activeConversation = ref(conversations.value[0] || null)
const showApplyModal = ref(false)
const selectedJob = ref(null)
const applyMessage = ref('')

const setTab = (tab) => {
  activeTab.value = tab
}

const handleProfileSave = (updatedProfile) => {
  profile.value = JSON.parse(JSON.stringify(updatedProfile))
}

const selectConversation = (conversation) => {
  activeConversation.value = conversation
  if (!threads.value[conversation.name]) {
    threads.value = { ...threads.value, [conversation.name]: [] }
  }
}

const handleSendMessage = (text) => {
  if (!activeConversation.value || !text.trim()) return
  const convoName = activeConversation.value.name
  const thread = threads.value[convoName] || []
  const newMessage = {
    id: Date.now(),
    from: 'me',
    author: 'You',
    text: text.trim(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
  const updatedThread = [...thread, newMessage]
  threads.value = { ...threads.value, [convoName]: updatedThread }
  conversations.value = conversations.value.map((c) =>
    c.name === convoName ? { ...c, lastMessage: 'Just now' } : c
  )
}

const startApply = (job) => {
  if (job.applied) return
  selectedJob.value = job
  applyMessage.value = `Hi ${job.company}, I'd like to apply for ${job.title}. Sharing my profile and availability.`
  showApplyModal.value = true
}

const closeApplyModal = () => {
  showApplyModal.value = false
  selectedJob.value = null
  applyMessage.value = ''
}

const handleJobApplication = () => {
  if (!selectedJob.value) return
  // Message et profil packagés pour l'offreur ; la conversation ne démarre que lorsqu'il répond.
  const baseMessage =
    applyMessage.value.trim() ||
    `I would like to apply for ${selectedJob.value.title} at ${selectedJob.value.company}.`
  const profileSummary = profile.value
    ? `Profile: ${profile.value.name} — ${profile.value.title} | Rate ${profile.value.rate} | Availability ${profile.value.availability} | Skills: ${(profile.value.skills || []).slice(0, 3).join(', ')}`
    : 'Profile shared.'
  const finalText = `${baseMessage} — ${profileSummary}`
  // Ici on stopperait l'envoi automatique vers Messages. À brancher côté recruteur pour initier la conversation.
  console.debug('Application prepared for employer:', {
    job: selectedJob.value,
    message: finalText,
  })
  // Flag job as applied (UI disables buttons and shows badge)
  const targetKey = selectedJob.value.id || `${selectedJob.value.company}-${selectedJob.value.title}`
  jobs.value = jobs.value.map((job) => {
    const jobKey = job.id || `${job.company}-${job.title}`
    return jobKey === targetKey ? { ...job, applied: true } : job
  })
  selectedJob.value = null
  closeApplyModal()
}

const startConversationWithApplicant = ({ job, applicant }) => {
  if (!applicant || !applicant.name) return
  const convoName = applicant.name
  const existing = conversations.value.find((c) => c.name === convoName)
  if (!existing) {
    conversations.value = [...conversations.value, { name: convoName, lastMessage: 'Just now' }]
  } else {
    conversations.value = conversations.value.map((c) =>
      c.name === convoName ? { ...c, lastMessage: 'Just now' } : c
    )
  }

  const thread = threads.value[convoName] || []
  const introMessage = `Bonjour ${applicant.name}, merci pour ta candidature sur ${job.title}. Dispo pour échanger ?`
  const newMessage = {
    id: Date.now(),
    from: 'me',
    author: 'You',
    text: introMessage,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
  threads.value = { ...threads.value, [convoName]: [...thread, newMessage] }
  activeConversation.value = conversations.value.find((c) => c.name === convoName) || activeConversation.value
  activeTab.value = 'Messages'
}

const handleRejectApplicant = ({ job, applicant }) => {
  const key = job.id || `${job.company}-${job.title}`
  jobs.value = jobs.value.map((item) => {
    const itemKey = item.id || `${item.company}-${item.title}`
    if (itemKey !== key) return item
    const filtered = (item.applicants || []).filter(
      (cand) => (cand.id || cand.name) !== (applicant.id || applicant.name)
    )
    return { ...item, applicants: filtered }
  })
}

const handleStartApplicantContract = ({ job, applicant }) => {
  // Placeholder: in a real app, trigger contract creation flow
  console.debug('Start contract with applicant', { job, applicant })
}
</script>

<template>
  <div class="page">
    <header class="top-bar">
      <div class="work-pill">WORK</div>
      <div class="profile">JD</div>
    </header>

    <section class="metrics">
      <article v-for="card in summaryCards" :key="card.title" class="metric-card">
        <div class="metric-top">
          <p class="metric-label">{{ card.title }}</p>
          <div class="metric-icon" :data-icon="card.icon" />
        </div>
        <p class="metric-value">{{ card.value }}</p>
        <p class="metric-change" :class="card.trend">{{ card.change }}</p>
      </article>
    </section>

    <nav class="tabs">
      <button v-for="tab in tabs" :key="tab" :class="['tab', { active: tab === activeTab }]" @click="setTab(tab)">
        {{ tab }}
      </button>
    </nav>

    <OverviewSection
      v-if="activeTab === 'Overview'"
      :projects="overviewData.projects"
      :transactions="overviewData.transactions"
    />
    <ContractsSection v-else-if="activeTab === 'Contracts'" :contracts="contractData" />
    <JobsSection
      v-else-if="activeTab === 'My Jobs'"
      :jobs="jobs"
      @apply-job="startApply"
      @start-applicant-conversation="startConversationWithApplicant"
      @reject-applicant="handleRejectApplicant"
      @start-applicant-contract="handleStartApplicantContract"
    />
    <RechargerJobsSection v-else-if="activeTab === 'Find a job'" :jobs="jobs" @apply-job="startApply" />
    <DaoDisputesSection v-else-if="activeTab === 'DAO'" :disputes="daoDisputes" />
    <MessagesSection
      v-else-if="activeTab === 'Messages'"
      :conversations="conversations"
      :active-conversation="activeConversation"
      :thread="threads[activeConversation?.name] || []"
      @select-conversation="selectConversation"
      @send-message="handleSendMessage"
    />
    <ProfileSection v-else :profile="profile" @save-profile="handleProfileSave" />

    <div v-if="showApplyModal" class="apply-overlay" @click.self="closeApplyModal">
      <div class="apply-card">
        <header class="apply-head">
          <div>
            <p class="eyebrow">Apply to</p>
            <h3>{{ selectedJob ? selectedJob.title : '' }} @ {{ selectedJob ? selectedJob.company : '' }}</h3>
            <p class="muted">Ajoute un message. Ton profil sera partagé automatiquement.</p>
          </div>
          <button class="close-btn" type="button" @click="closeApplyModal">x</button>
        </header>

        <label class="field">
          <span>Message</span>
          <textarea
            v-model="applyMessage"
            rows="4"
            placeholder="Présente ton intérêt, dispo et pourquoi tu es adapté."
          ></textarea>
        </label>

        <div class="profile-share">
          <p class="label">Profil partagé</p>
          <p class="value">{{ profile.name }} — {{ profile.title }}</p>
          <p class="muted">Rate: {{ profile.rate }} | Availability: {{ profile.availability }}</p>
          <p class="muted">Skills: {{ (profile.skills || []).slice(0, 4).join(', ') }}</p>
        </div>

        <div class="apply-actions">
          <button class="ghost-btn" type="button" @click="closeApplyModal">Annuler</button>
          <button class="primary-btn" type="button" @click="handleJobApplication">Envoyer & partager</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto 48px;
  padding: 8px;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.work-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  min-width: 72px;
  border-radius: 14px;
  background: radial-gradient(circle at 30% 30%, rgba(120, 90, 255, 0.5), rgba(0, 198, 255, 0.35)),
    linear-gradient(145deg, rgba(24, 33, 64, 0.9), rgba(18, 26, 54, 0.96));
  color: #eef2ff;
  font-weight: 800;
  letter-spacing: 0.08em;
  font-size: 12px;
  box-shadow:
    0 14px 32px rgba(0, 0, 0, 0.35),
    0 0 12px rgba(120, 90, 255, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.profile {
  height: 40px;
  width: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1f3246, #2f4f6c);
  display: grid;
  place-items: center;
  color: #e9f2ff;
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.metric-card {
  background: linear-gradient(160deg, #0a0f1f 0%, #0b1328 100%);
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 14px;
  padding: 18px 18px 16px;
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.45),
    0 0 20px rgba(120, 90, 255, 0.28);
}

.metric-top {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-bottom: 14px;
}

.metric-label {
  color: #8f9cb8;
  font-size: 13px;
}

.metric-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  min-width: 32px;
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(106, 72, 255, 0.2), rgba(0, 198, 255, 0.16));
  border: 1px solid rgba(120, 90, 255, 0.4);
  white-space: nowrap;
}

.metric-icon::before {
  content: attr(data-icon);
  color: #a782ff;
  font-size: 11px;
  line-height: 1;
  text-transform: capitalize;
}

.metric-value {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-size: 26px;
  font-weight: 800;
  margin-bottom: 6px;
  letter-spacing: 0.4px;
}

.metric-change {
  font-size: 12px;
  color: #8f9cb8;
}

.metric-change.up {
  color: #99f0ff;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 12px 0 22px;
}

.tab {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(120, 90, 255, 0.18);
  color: #9babc8;
  padding: 10px 18px;
  border-radius: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25);
}

.tab:hover {
  color: #dfe7ff;
  border-color: rgba(120, 90, 255, 0.3);
}

.tab.active {
  color: #061227;
  background: linear-gradient(90deg, #6a48ff, #00c6ff);
  border-color: rgba(120, 90, 255, 0.5);
  box-shadow:
    0 10px 24px rgba(0, 102, 255, 0.28),
    0 0 12px rgba(106, 72, 255, 0.25);
}

@media (max-width: 720px) {
  .page {
    padding: 0;
  }

  .metrics {
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  }
}

.apply-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 16, 0.78);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 18px;
  z-index: 30;
}

.apply-card {
  width: min(520px, 100%);
  background: radial-gradient(circle at 20% 20%, rgba(120, 90, 255, 0.14), rgba(0, 198, 255, 0)) ,
    linear-gradient(165deg, rgba(7, 10, 24, 0.97), rgba(10, 18, 36, 0.95));
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

.apply-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.apply-head h3 {
  margin: 0;
  color: #eae7ff;
}

.close-btn {
  height: 32px;
  width: 32px;
  border-radius: 50%;
  border: 1px solid rgba(120, 90, 255, 0.45);
  background: rgba(120, 90, 255, 0.18);
  color: #e2dbff;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
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

.field textarea {
  resize: vertical;
  min-height: 120px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(120, 90, 255, 0.35);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  padding: 12px 14px;
  color: #eae7ff;
  font-size: 14px;
}

.profile-share {
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 12px;
  padding: 12px 12px;
  background: linear-gradient(160deg, rgba(120, 90, 255, 0.14), rgba(0, 198, 255, 0.08));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
}

.apply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.apply-actions .primary-btn {
  padding: 10px 16px;
  border-radius: 12px;
  background: linear-gradient(90deg, #6a48ff, #00c6ff);
  color: #061227;
  border: 1px solid rgba(120, 90, 255, 0.4);
}

.apply-actions .ghost-btn {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: #e2dbff;
}
</style>
