<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import flatpickr from 'flatpickr'
import 'flatpickr/dist/themes/dark.css'

const props = defineProps({
  employers: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['close', 'submit'])

const form = reactive({
  title: '',
  price: '',
  timeline: { start: '', end: '' },
  description: '',
  checkpoints: '',
  employer: '',
})

const startInput = ref(null)
const endInput = ref(null)
let startPicker = null
let endPicker = null

const todayIso = computed(() => new Date().toISOString().split('T')[0])

const canSubmit = computed(() => {
  return (
    form.title &&
    form.price &&
    form.timeline.start &&
    form.timeline.end &&
    form.description &&
    form.checkpoints &&
    form.employer
  )
})

const normalizeIso = (date) => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60 * 1000)
  return local.toISOString().split('T')[0]
}

const syncEndMinDate = () => {
  if (endPicker) {
    endPicker.set('minDate', form.timeline.start || todayIso.value)
    if (form.timeline.end && form.timeline.end < (form.timeline.start || todayIso.value)) {
      form.timeline.end = form.timeline.start
      endPicker.setDate(form.timeline.end, false, 'Y-m-d')
    }
  }
}

onMounted(() => {
  startPicker = flatpickr(startInput.value, {
    dateFormat: 'M d, Y',
    minDate: 'today',
    locale: { firstDayOfWeek: 1 },
    defaultDate: form.timeline.start || null,
    onChange: (dates) => {
      const iso = normalizeIso(dates[0])
      form.timeline.start = iso
      syncEndMinDate()
    },
  })

  endPicker = flatpickr(endInput.value, {
    dateFormat: 'M d, Y',
    minDate: form.timeline.start || 'today',
    locale: { firstDayOfWeek: 1 },
    defaultDate: form.timeline.end || null,
    onChange: (dates) => {
      const iso = normalizeIso(dates[0])
      if (iso && iso < (form.timeline.start || todayIso.value)) {
        form.timeline.end = form.timeline.start
        endPicker.setDate(form.timeline.end, false, 'Y-m-d')
      } else {
        form.timeline.end = iso
      }
    },
  })
})

onBeforeUnmount(() => {
  startPicker?.destroy()
  endPicker?.destroy()
})

const submitForm = () => {
  if (form.timeline.start < todayIso.value) {
    form.timeline.start = todayIso.value
    startPicker?.setDate(form.timeline.start, false, 'Y-m-d')
    syncEndMinDate()
    return
  }
  if (form.timeline.end < form.timeline.start) {
    form.timeline.end = form.timeline.start
    endPicker?.setDate(form.timeline.end, false, 'Y-m-d')
    return
  }
  if (!canSubmit.value) return
  emit('submit', {
    ...form,
    timeline: { ...form.timeline },
  })
}

const close = () => emit('close')
</script>

<template>
  <div class="modal">
    <header class="modal-head">
      <div>
        <p class="eyebrow">New contract</p>
        <h3>Generate a smart contract</h3>
        <p class="muted">Set financial details and validation checkpoints to launch escrow.</p>
      </div>
      <button class="close" type="button" @click="close">×</button>
    </header>

    <div class="grid">
      <label class="field">
        <span>Title</span>
        <input v-model="form.title" placeholder="e.g., L2 Audit November" />
      </label>
      <label class="field">
        <span>Assign to</span>
        <div class="select-shell">
          <select v-model="form.employer">
            <option value="" disabled>Select a client</option>
            <option v-for="name in employers" :key="name" :value="name">{{ name }}</option>
          </select>
        </div>
      </label>
      <label class="field">
        <span>Total budget</span>
        <input v-model="form.price" placeholder="e.g., 15,000 USDC" />
      </label>
      <div class="field date-grid">
        <label>
          <span>Start date</span>
          <input ref="startInput" type="text" class="date-input" placeholder="Select a date" readonly />
        </label>
        <label>
          <span>End date</span>
          <input ref="endInput" type="text" class="date-input" placeholder="Select a date" readonly />
        </label>
      </div>
      <label class="field full">
        <span>Description</span>
        <textarea v-model="form.description" rows="3" placeholder="Contract scope, deliverables, etc." />
      </label>
      <label class="field full">
        <span>Validation checkpoints</span>
        <textarea
          v-model="form.checkpoints"
          rows="3"
          placeholder="List milestones the client must approve."
        />
      </label>
    </div>

    <footer class="actions">
      <button class="ghost" type="button" @click="close">Cancel</button>
      <button class="primary" type="button" :disabled="!canSubmit" @click="submitForm">Create contract</button>
    </footer>
  </div>
</template>

<style scoped>
.modal {
  width: min(640px, 100%);
  background: radial-gradient(circle at 20% 20%, rgba(120, 90, 255, 0.15), transparent 45%), rgba(6, 10, 24, 0.95);
  border-radius: 22px;
  border: 1px solid rgba(120, 90, 255, 0.35);
  padding: 20px;
  box-shadow:
    0 30px 60px rgba(0, 0, 0, 0.6),
    0 0 28px rgba(120, 90, 255, 0.35);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.eyebrow {
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #8f9cb8;
  font-weight: 800;
}

h3 {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-size: 20px;
  margin: 4px 0;
}

.muted {
  color: #7c8db2;
  font-size: 13px;
}

.close {
  border: 1px solid rgba(120, 90, 255, 0.4);
  background: rgba(255, 255, 255, 0.04);
  color: #dfe7ff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #dfe7ff;
}

.field.full {
  grid-column: 1 / -1;
}

.field span {
  font-weight: 700;
}

.field input,
.field textarea,
.select-shell select,
.date-input {
  border-radius: 12px;
  border: 1px solid rgba(120, 90, 255, 0.28);
  background: rgba(255, 255, 255, 0.04);
  padding: 10px 12px;
  color: #eae7ff;
  font-size: 14px;
}

.field input:focus,
.field textarea:focus,
.select-shell select:focus,
.date-input:focus {
  outline: none;
  border-color: rgba(0, 198, 255, 0.5);
  background: rgba(9, 12, 24, 0.95);
  box-shadow:
    0 0 12px rgba(0, 198, 255, 0.18),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.select-shell {
  position: relative;
}

.field select {
  width: 100%;
  appearance: none;
  cursor: pointer;
  background: transparent;
}

.field select option {
  background: rgba(10, 15, 31, 0.95);
  color: #eae7ff;
}

.select-shell {
  position: relative;
}

.select-shell::after {
  content: '▾';
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #d9c5ff;
}

textarea {
  resize: vertical;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.ghost,
.primary {
  padding: 10px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: #dfe7ff;
  font-weight: 700;
  cursor: pointer;
}

.primary {
  background: linear-gradient(90deg, #6a48ff, #00c6ff);
  border: none;
  color: #061227;
}

.primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
