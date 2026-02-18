<script setup>
import { computed, reactive, ref, watch } from "vue"
const props = defineProps({
  profile: { type: Object, default: () => ({}) },
  reputation: {
    type: Object,
    default: () => ({
      contractsValidated: 0,
      disputesWon: 0,
      disputesLost: 0,
      disputesSplit: 0,
      disputesOpen: 0,
    }),
  },
  reputationLoading: { type: Boolean, default: false },
  reputationError: { type: String, default: "" },
  loading: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  error: { type: String, default: "" },
})

const emit = defineEmits(["save-profile"])

const baseProfile = {
  name: "",
  title: "",
  location: "",
  rate: "",
  availability: "",
  bio: "",
  skills: [],
  highlights: [],
  portfolio: [],
}

const createDraft = (source = {}) => ({
  ...baseProfile,
  ...source,
  skills: [...((source && source.skills) || [])],
  highlights: [...((source && source.highlights) || [])],
  portfolio: ((source && source.portfolio) || []).map((item) => ({ ...item })),
})

const editMode = ref(false)
const editedProfile = reactive(createDraft(props.profile || baseProfile))
const currentProfile = computed(() => ({ ...baseProfile, ...(props.profile || {}) }))
const previewProfile = computed(() => (editMode.value ? editedProfile : currentProfile.value))

const skillInput = ref("")
const highlightInput = ref("")
const newPortfolio = reactive({ label: "", tech: "", link: "" })

const resetForm = () => {
  Object.assign(editedProfile, createDraft(props.profile))
  skillInput.value = ""
  highlightInput.value = ""
  Object.assign(newPortfolio, { label: "", tech: "", link: "" })
}

watch(
  () => props.profile,
  () => resetForm(),
  { deep: true },
)

const startEditing = () => {
  if (props.loading || props.saving) return
  resetForm()
  editMode.value = true
}

const cancelEdit = () => {
  resetForm()
  editMode.value = false
}

const addSkill = () => {
  const value = skillInput.value.trim()
  if (!value) return
  editedProfile.skills.push(value)
  skillInput.value = ""
}

const removeSkill = (index) => editedProfile.skills.splice(index, 1)

const addHighlight = () => {
  const value = highlightInput.value.trim()
  if (!value) return
  editedProfile.highlights.push(value)
  highlightInput.value = ""
}

const removeHighlight = (index) => editedProfile.highlights.splice(index, 1)

const addPortfolioItem = () => {
  const label = newPortfolio.label.trim()
  const tech = newPortfolio.tech.trim()
  const link = newPortfolio.link.trim()
  if (!label || !tech) return
  editedProfile.portfolio.push({ label, tech, link: link || "#" })
  Object.assign(newPortfolio, { label: "", tech: "", link: "" })
}

const removePortfolioItem = (index) => editedProfile.portfolio.splice(index, 1)

const saveProfile = () => {
  if (props.saving || props.loading) return
  emit("save-profile", createDraft(editedProfile))
  editMode.value = false
}

const toNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const reputationStats = computed(() => ({
  contractsValidated: toNumber(props.reputation?.contractsValidated),
  disputesWon: toNumber(props.reputation?.disputesWon),
  disputesLost: toNumber(props.reputation?.disputesLost),
  disputesSplit: toNumber(props.reputation?.disputesSplit),
  disputesOpen: toNumber(props.reputation?.disputesOpen),
}))

const reliabilityScore = computed(() => {
  const s = reputationStats.value
  const positive = s.contractsValidated + s.disputesWon
  const neutral = s.disputesSplit * 0.5
  const negative = s.disputesLost + s.disputesOpen * 0.75
  const denominator = positive + neutral + negative
  if (denominator <= 0) return 0
  return Math.max(0, Math.min(100, Math.round(((positive + neutral) / denominator) * 100)))
})

const reliabilityLabel = computed(() => {
  const score = reliabilityScore.value
  if (score >= 75) return "Excellent Reliability"
  if (score >= 50) return "Moderate Reliability"
  return "Low Reliability"
})

const scoreTone = computed(() => {
  const score = reliabilityScore.value
  if (score >= 70) return "good"
  if (score >= 40) return "warn"
  return "bad"
})

const successRate = computed(() => {
  const s = reputationStats.value
  const resolved = s.disputesWon + s.disputesLost + s.disputesSplit
  if (resolved <= 0) return 0
  return Math.round(((s.disputesWon + s.disputesSplit * 0.5) / resolved) * 100)
})

const totalKpiBase = computed(() => {
  const s = reputationStats.value
  return Math.max(1, s.contractsValidated + s.disputesWon + s.disputesLost + s.disputesSplit + s.disputesOpen)
})

const kpis = computed(() => {
  const s = reputationStats.value
  const base = totalKpiBase.value
  return [
    { key: "contracts", label: "Validated contracts", value: s.contractsValidated, pct: Math.round((s.contractsValidated / base) * 100), tone: "ok" },
    { key: "won", label: "Disputes won", value: s.disputesWon, pct: Math.round((s.disputesWon / base) * 100), tone: "good" },
    { key: "open", label: "Disputes open", value: s.disputesOpen, pct: Math.round((s.disputesOpen / base) * 100), tone: "warn" },
    { key: "lost", label: "Disputes lost", value: s.disputesLost, pct: Math.round((s.disputesLost / base) * 100), tone: "bad" },
    { key: "split", label: "Disputes split", value: s.disputesSplit, pct: Math.round((s.disputesSplit / base) * 100), tone: "split" },
  ]
})

const ringStyle = computed(() => {
  const score = reliabilityScore.value
  const color = scoreTone.value === "good" ? "#72d63f" : scoreTone.value === "warn" ? "#f3a233" : "#f06063"
  const trail = scoreTone.value === "good" ? "rgba(114, 214, 63, 0.2)" : scoreTone.value === "warn" ? "rgba(243, 162, 51, 0.2)" : "rgba(240, 96, 99, 0.2)"
  return {
    background: `conic-gradient(${color} 0 ${score}%, ${trail} ${score}% 100%)`,
  }
})
</script>

<template>
  <section class="profile-section">
    <div class="header-card">
      <div class="profile-top-grid">
        <article class="preview-card-lite preview-main">
          <h3>Profile Preview</h3>
          <div class="preview-identity">
            <p class="eyebrow">Private Profile</p>
            <div v-if="loading" class="muted">Chargement du profil…</div>
            <div v-else>
              <h2>{{ previewProfile.name }}</h2>
              <p class="title">{{ previewProfile.title }}</p>
              <p class="muted">{{ previewProfile.location }}</p>
            </div>
            <p v-if="error" class="error">{{ error }}</p>
          </div>
          <p class="helper">This is what clients see when you share your profile.</p>
          <div class="chips">
            <span class="chip">Rate: {{ previewProfile.rate }}</span>
            <span class="chip">Availability: {{ previewProfile.availability }}</span>
          </div>
          <p class="bio">{{ previewProfile.bio }}</p>

          <div class="preview-split">
            <div class="preview-block">
              <p class="block-title">Core Skills</p>
              <div class="tags">
                <span v-for="skill in previewProfile.skills" :key="skill" class="tag">{{ skill }}</span>
              </div>
            </div>
            <div class="preview-block">
              <p class="block-title">Highlights</p>
              <ul class="highlights">
                <li v-for="item in previewProfile.highlights" :key="item">{{ item }}</li>
              </ul>
            </div>
          </div>
        </article>

        <div class="right-stack">
          <section class="reliability-box">
            <div class="reliability-content">
              <div class="score-column">
                <div class="score-ring" :style="ringStyle">
                  <div class="score-core">
                    <strong>{{ reliabilityScore }}</strong>
                    <span>%</span>
                  </div>
                </div>
                <p class="score-title">{{ reliabilityLabel }}</p>
                <p class="success-rate">Taux de succès: {{ successRate }}%</p>
              </div>

              <div class="score-meta">
                <p class="score-heading">Fiabilité</p>
                <p v-if="reputationLoading" class="muted">Loading reputation…</p>
                <p v-else-if="reputationError" class="muted">{{ reputationError }}</p>
                <div v-else class="kpi-list">
                  <div v-for="item in kpis" :key="item.key" class="kpi-row">
                    <span class="kpi-label">{{ item.value }} {{ item.label }}</span>
                    <span class="kpi-pct">{{ item.pct }}%</span>
                    <div class="kpi-track">
                      <div :class="['kpi-fill', item.tone]" :style="{ width: `${item.pct}%` }" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <article class="preview-card-lite portfolio-card">
            <h3>Portfolio</h3>
            <div class="portfolio">
              <div v-for="item in previewProfile.portfolio" :key="item.label" class="portfolio-item">
                <p class="label">{{ item.label }}</p>
                <p class="muted">{{ item.tech }}</p>
                <a class="link" :href="item.link || '#'" target="_blank" rel="noreferrer">View</a>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>

    <div class="edit-layout">
      <article class="card form-card">
        <div class="section-head">
          <h3>Profile details</h3>
          <div class="actions">
            <button
              v-if="!editMode"
              class="primary-btn"
              :disabled="loading || saving"
              @click="startEditing"
            >
              Edit profile
            </button>

            <div v-else class="action-row">
              <button class="ghost-btn" :disabled="saving" @click="cancelEdit">Cancel</button>
              <button class="primary-btn" :disabled="saving" @click="saveProfile">
                <span v-if="saving">Saving…</span>
                <span v-else>Save changes</span>
              </button>
            </div>
          </div>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>Full name</span>
            <input v-model="editedProfile.name" :disabled="!editMode || saving || loading" placeholder="Enter your name" />
          </label>

          <label class="field">
            <span>Title</span>
            <input v-model="editedProfile.title" :disabled="!editMode || saving || loading" placeholder="What do you do?" />
          </label>

          <label class="field">
            <span>Location</span>
            <input v-model="editedProfile.location" :disabled="!editMode || saving || loading" placeholder="Remote, city or timezone" />
          </label>

          <label class="field">
            <span>Rate</span>
            <input v-model="editedProfile.rate" :disabled="!editMode || saving || loading" placeholder="120 USDC/hr" />
          </label>

          <label class="field">
            <span>Availability</span>
            <input v-model="editedProfile.availability" :disabled="!editMode || saving || loading" placeholder="Hours per week" />
          </label>

          <label class="field span-2">
            <span>Bio</span>
            <textarea
              v-model="editedProfile.bio"
              :disabled="!editMode || saving || loading"
              rows="3"
              placeholder="Short summary of what you ship"
            />
          </label>
        </div>

        <div class="field-group">
          <div class="field-head">
            <h4>Skills</h4>
            <p class="helper">Add the stack you want to show.</p>
          </div>

          <div class="chip-input" v-if="editMode">
            <input
              v-model="skillInput"
              :disabled="saving || loading"
              placeholder="Add a skill"
              @keyup.enter.prevent="addSkill"
            />
            <button class="pill-btn" :disabled="saving || loading" @click="addSkill">Add</button>
          </div>

          <div class="tags editable">
            <span v-for="(skill, index) in editedProfile.skills" :key="skill + index" class="tag">
              {{ skill }}
              <button v-if="editMode" class="remove-btn" :disabled="saving || loading" @click="removeSkill(index)">x</button>
            </span>
          </div>
        </div>

        <div class="field-group">
          <div class="field-head">
            <h4>Highlights</h4>
            <p class="helper">Show wins clients care about.</p>
          </div>

          <div class="chip-input" v-if="editMode">
            <input
              v-model="highlightInput"
              :disabled="saving || loading"
              placeholder="Add a highlight"
              @keyup.enter.prevent="addHighlight"
            />
            <button class="pill-btn" :disabled="saving || loading" @click="addHighlight">Add</button>
          </div>

          <ul class="highlights">
            <li v-for="(item, index) in editedProfile.highlights" :key="item + index">
              {{ item }}
              <button v-if="editMode" class="remove-btn" :disabled="saving || loading" @click="removeHighlight(index)">x</button>
            </li>
          </ul>
        </div>

        <div class="field-group">
          <div class="field-head">
            <h4>Portfolio</h4>
            <p class="helper">Link to work samples, reports or repos.</p>
          </div>

          <div class="portfolio-form" v-if="editMode">
            <input v-model="newPortfolio.label" :disabled="saving || loading" placeholder="Title" />
            <input v-model="newPortfolio.tech" :disabled="saving || loading" placeholder="Tech stack" />
            <input v-model="newPortfolio.link" :disabled="saving || loading" placeholder="Link (optional)" />
            <button class="pill-btn" :disabled="saving || loading" @click="addPortfolioItem">Add project</button>
          </div>

          <div class="portfolio editable">
            <div v-for="(item, index) in editedProfile.portfolio" :key="item.label + index" class="portfolio-item">
              <p class="label">{{ item.label }}</p>
              <p class="muted">{{ item.tech }}</p>
              <a class="link" :href="item.link || '#'" target="_blank" rel="noreferrer">View</a>
              <button v-if="editMode" class="remove-btn" :disabled="saving || loading" @click="removePortfolioItem(index)">
                Remove
              </button>
            </div>
          </div>
        </div>
      </article>

    </div>

    <div class="note">
      <p>
        When you apply, your latest profile details are sent to the job poster. They can reply here to start a message
        thread immediately.
      </p>
    </div>
  </section>
</template>


<style scoped>
.profile-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-card {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  justify-content: space-between;
  gap: 12px;
  background: linear-gradient(160deg, var(--panel) 0%, var(--panel-strong) 100%) !important;
  border: 1px solid var(--border-soft) !important;
  border-radius: 14px;
  padding: 14px;
  box-shadow:
    0 12px 26px rgba(0, 0, 0, 0.32),
    0 0 18px rgba(120, 90, 255, 0.2);
  background-image:
    radial-gradient(circle at 72% 8%, rgba(115, 137, 255, 0.18), transparent 36%),
    radial-gradient(circle at 15% 90%, rgba(112, 80, 255, 0.14), transparent 42%),
    linear-gradient(160deg, var(--panel) 0%, var(--panel-strong) 100%);
}

.profile-top-grid {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(320px, 1fr);
  gap: 14px;
}

.right-stack {
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 12px;
}

.reliability-box {
  border-radius: 14px;
  border: 1px solid rgba(120, 90, 255, 0.25);
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
}

.reliability-content {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 12px;
}

.score-column {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 8px;
}

.score-heading {
  color: #e8efff;
  font-weight: 800;
  font-size: 18px;
  margin-bottom: 8px;
}

.reliability-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.reliability-card {
  border: 1px solid rgba(120, 90, 255, 0.2);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  padding: 10px;
}

.reliability-value {
  color: #ecf4ff;
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
}

.reliability-label {
  color: #d6e1fa;
  font-size: 16px;
  font-weight: 600;
}

.reliability-sub {
  color: #98abd2;
  font-size: 13px;
}

.preview-card-lite {
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
  display: grid;
  gap: 8px;
}

.preview-main {
  align-content: start;
}

.preview-identity {
  display: grid;
  gap: 3px;
  margin-bottom: 2px;
}

.preview-split {
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid rgba(120, 90, 255, 0.2);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.preview-card-lite h3 {
  margin: 0;
}

.score-ring {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  padding: 8px;
  display: grid;
  place-items: center;
  box-shadow:
    0 10px 20px rgba(0, 0, 0, 0.34),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.score-core {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.08), rgba(7, 16, 38, 0.95));
  color: #f0f6ff;
  font-weight: 800;
}

.score-core strong {
  font-size: 28px;
  line-height: 1;
}

.score-core span {
  margin-top: -4px;
  font-size: 14px;
  color: #b7c6e7;
}

.score-meta {
  flex: 1;
  min-width: 0;
}

.score-title {
  color: #eaf2ff;
  font-weight: 700;
  margin-bottom: 0;
  text-align: center;
}

.kpi-list {
  display: grid;
  gap: 7px;
}

.kpi-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 10px;
  align-items: center;
}

.kpi-label {
  color: #d8e3fb;
  font-size: 12px;
}

.kpi-pct {
  color: #eaf2ff;
  font-size: 12px;
  font-weight: 700;
}

.kpi-track {
  grid-column: 1 / -1;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.kpi-fill {
  height: 100%;
  border-radius: inherit;
}

.kpi-fill.ok {
  background: linear-gradient(90deg, #6ecb41, #8ce35e);
}

.kpi-fill.good {
  background: linear-gradient(90deg, #4dc855, #8ce35e);
}

.kpi-fill.warn {
  background: linear-gradient(90deg, #f39b2f, #ffc96f);
}

.kpi-fill.bad {
  background: linear-gradient(90deg, #f55f62, #ff8c8f);
}

.kpi-fill.split {
  background: linear-gradient(90deg, #7a8cff, #9cb7ff);
}

.success-rate {
  margin-top: 4px;
  color: #c9d8f4;
  font-size: 13px;
  font-weight: 600;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.primary-btn {
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

.ghost-btn {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(120, 90, 255, 0.2);
  background: rgba(120, 90, 255, 0.08);
  color: #e2dbff;
  font-weight: 700;
  cursor: pointer;
}

.action-row {
  display: flex;
  gap: 8px;
}

.eyebrow {
  color: #8f9cb8;
  font-size: 12px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

h2 {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-size: 20px;
  font-weight: 800;
}

.title {
  color: #d6def5;
  font-weight: 600;
}

.muted {
  color: #8f9cb8;
}

.edit-layout {
  display: block;
  width: 100%;
}

.card {
  background: linear-gradient(160deg, rgba(8, 12, 24, 0.92), rgba(10, 17, 32, 0.9));
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 14px;
  padding: 14px;
  box-shadow:
    0 12px 26px rgba(0, 0, 0, 0.32),
    0 0 18px rgba(120, 90, 255, 0.2);
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.section-head h3 {
  color: #eae7ff;
  font-weight: 700;
}

.helper {
  color: #8f9cb8;
  font-size: 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field span {
  color: #b8c8e4;
  font-size: 13px;
}

.field input,
.field textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(120, 90, 255, 0.25);
  color: #eae7ff;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
}

.field input:disabled,
.field textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.field textarea {
  resize: vertical;
  min-height: 96px;
}

.span-2 {
  grid-column: span 2;
}

.field-group {
  margin-top: 14px;
  border-top: 1px solid rgba(120, 90, 255, 0.2);
  padding-top: 12px;
  display: grid;
  gap: 8px;
}

.field-head h4 {
  color: #eae7ff;
  margin-bottom: 2px;
}

.chip-input {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.chip-input input {
  flex: 1;
  min-width: 160px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(120, 90, 255, 0.25);
  background: rgba(255, 255, 255, 0.04);
  color: #eae7ff;
}

.pill-btn {
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid rgba(120, 90, 255, 0.35);
  background: rgba(120, 90, 255, 0.16);
  color: #e2dbff;
  font-weight: 700;
  cursor: pointer;
}

.tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 7px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #dfe7f5;
  font-weight: 600;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tags.editable {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  padding: 10px;
  border: 1px dashed rgba(120, 90, 255, 0.25);
}

.remove-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #dfe7f5;
  border-radius: 8px;
  padding: 2px 6px;
  cursor: pointer;
  font-size: 12px;
}

.bio {
  color: #c5d5ec;
  line-height: 1.6;
  margin-bottom: 10px;
}

.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  background: rgba(120, 90, 255, 0.12);
  border: 1px solid rgba(120, 90, 255, 0.35);
  color: #e2dbff;
  padding: 6px 10px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 13px;
}

.highlights {
  padding-left: 16px;
  color: #c5d5ec;
  display: grid;
  gap: 6px;
}

.portfolio {
  display: grid;
  gap: 10px;
}

.portfolio-item {
  border-radius: 10px;
  padding: 10px;
  background: linear-gradient(160deg, var(--panel) 0%, var(--panel-strong) 100%) !important;
  border: 1px solid var(--border-soft) !important;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.28);
  display: grid;
  gap: 2px;
}

.portfolio-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.portfolio-form input {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(120, 90, 255, 0.25);
  background: rgba(255, 255, 255, 0.04);
  color: #eae7ff;
}

.label {
  color: #eae7ff;
  font-weight: 700;
}

.link {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-weight: 800;
  display: inline-block;
}

.preview-block {
  margin-top: 0;
}

.block-title {
  color: #d6def5;
  font-weight: 700;
  margin-bottom: 6px;
}

.note {
  border: 1px dashed rgba(120, 90, 255, 0.35);
  border-radius: 12px;
  padding: 12px 14px;
  color: #b8c8e4;
  background: rgba(120, 90, 255, 0.08);
}

@media (max-width: 720px) {
  .header-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .profile-top-grid {
    grid-template-columns: 1fr;
  }

  .reliability-content {
    grid-template-columns: 1fr;
  }

  .actions,
  .action-row {
    width: 100%;
    justify-content: flex-end;
  }

  .preview-split,
  .reliability-grid {
    grid-template-columns: 1fr;
  }

  .edit-layout {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: span 1;
  }
}
</style>
