<script setup>
import { computed, reactive, ref, watch } from "vue"

const props = defineProps({
  profile: { type: Object, default: () => ({}) },
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
</script>

<template>
  <section class="profile-section">
    <div class="header-card">
      <div>
        <p class="eyebrow">Private Profile</p>

        <div v-if="loading" class="muted">Chargement du profil…</div>
        <div v-else>
          <h2>{{ previewProfile.name }}</h2>
          <p class="title">{{ previewProfile.title }}</p>
          <p class="muted">{{ previewProfile.location }}</p>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
      </div>

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

    <div class="edit-layout">
      <article class="card form-card">
        <div class="section-head">
          <h3>Profile details</h3>
          <p class="helper">Update your headline, rates and bio in one place.</p>
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

      <article class="card preview-card">
        <div class="section-head">
          <h3>Profile preview</h3>
          <p class="helper">This is what clients see when you share your profile.</p>
        </div>

        <div class="chips">
          <span class="chip">Rate: {{ previewProfile.rate }}</span>
          <span class="chip">Availability: {{ previewProfile.availability }}</span>
        </div>

        <p class="bio">{{ previewProfile.bio }}</p>

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

        <div class="preview-block">
          <p class="block-title">Portfolio</p>
          <div class="portfolio">
            <div v-for="item in previewProfile.portfolio" :key="item.label" class="portfolio-item">
              <p class="label">{{ item.label }}</p>
              <p class="muted">{{ item.tech }}</p>
              <a class="link" :href="item.link || '#'" target="_blank" rel="noreferrer">View</a>
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
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: linear-gradient(160deg, rgba(8, 12, 24, 0.95), rgba(10, 17, 32, 0.92));
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 14px;
  padding: 14px;
  box-shadow:
    0 12px 26px rgba(0, 0, 0, 0.32),
    0 0 18px rgba(120, 90, 255, 0.2);
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
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 14px;
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
  align-items: center;
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
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 10px;
  padding: 10px;
  background: rgba(7, 12, 24, 0.78);
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

.preview-card {
  position: relative;
}

.preview-block {
  margin-top: 12px;
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

  .actions {
    width: 100%;
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
