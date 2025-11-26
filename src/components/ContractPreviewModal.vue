<script setup>
defineProps({
  contract: {
    type: Object,
    required: true,
  },
})
const emit = defineEmits(['close'])
const close = () => emit('close')
</script>

<template>
  <div class="modal">
    <header class="modal-head">
      <div>
        <p class="eyebrow">Contract Preview</p>
        <h3>{{ contract.name }}</h3>
        <p class="muted">{{ contract.client }}</p>
      </div>
      <button class="close" type="button" @click="close">×</button>
    </header>

    <div class="grid">
      <article class="info">
        <p class="label">Amount</p>
        <p class="value">{{ contract.amount }}</p>
      </article>
      <article class="info">
        <p class="label">Period</p>
        <p class="value">{{ contract.period }}</p>
      </article>
      <article class="info">
        <p class="label">Status</p>
        <p class="value status">{{ contract.status }}</p>
      </article>
      <article class="info full">
        <p class="label">Description</p>
        <p class="body">{{ contract.description || 'No description provided.' }}</p>
      </article>
      <article class="info full">
        <p class="label">Validation checkpoints</p>
        <p class="body">{{ contract.checkpoints || 'No checkpoints provided.' }}</p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.modal {
  width: min(520px, 100%);
  background: radial-gradient(circle at 20% 20%, rgba(120, 90, 255, 0.14), rgba(0, 198, 255, 0)),
    linear-gradient(165deg, rgba(7, 10, 24, 0.97), rgba(10, 18, 36, 0.95));
  border: 1px solid rgba(120, 90, 255, 0.35);
  border-radius: 18px;
  box-shadow:
    0 24px 44px rgba(0, 0, 0, 0.5),
    0 0 28px rgba(120, 90, 255, 0.32);
  padding: 18px;
  color: #dfe7ff;
  display: grid;
  gap: 14px;
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
  border: 1px solid rgba(120, 90, 255, 0.45);
  background: rgba(120, 90, 255, 0.18);
  color: #e2dbff;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
}

.grid {
  display: grid;
  gap: 12px;
}

.info {
  border: 1px solid rgba(120, 90, 255, 0.24);
  border-radius: 14px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.02);
}

.info.full {
  grid-column: 1 / -1;
}

.label {
  color: #9fb0cc;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.value,
.body {
  margin-top: 4px;
  font-weight: 700;
  color: #f4f6ff;
}

.body {
  font-weight: 500;
  line-height: 1.6;
  color: #dfe7ff;
}

.value.status {
  text-transform: capitalize;
}
</style>
