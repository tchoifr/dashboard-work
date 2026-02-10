<!-- src/components/ContractCreationModal.vue -->
<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue"

import { useContractCreationState } from "../contract/state"
import { initPickers, destroyPickers, syncEndMinDate } from "../contract/pickers"
import { loadUsdcBalance } from "../contract/usdc"
import { submitForm as submitFormAction } from "../contract/submit"

const props = defineProps({
  employers: { type: Array, default: () => [] }, // ⚠️ ici ce sont tes freelances sélectionnables
  programId: String,
  usdcMint: String,
  chain: String,
  rpcUrl: String,
  feeVaultAta: String,
  disputeVaultAta: String,
  feePlatformBps: Number,
  disputeFeeBps: Number,
  feeWallet: String,
  admin1: String,
  admin2: String,
})

const emit = defineEmits(["close", "created"])

const {
  auth,
  form,
  loading,
  txStatus,
  usdcBalance,
  walletAddress,
  usdcMintMissing,
  programIdMissing,
  canSubmit,
} = useContractCreationState(props)

const startInput = ref(null)
const endInput = ref(null)
let startPicker = null
let endPicker = null

function close() {
  emit("close")
}

async function submitForm() {
  return submitFormAction({
    props,
    canSubmit,
    form,
    loading,
    txStatus,
    usdcBalance,
    auth,
    walletAddress,
    emit,
  })
}

onMounted(() => {
  initPickers({
    startInput,
    endInput,
    form,
    setStartPicker: (p) => (startPicker = p),
    setEndPicker: (p) => (endPicker = p),
    onStartChange: () => syncEndMinDate({ endPicker, form }),
  })

  loadUsdcBalance({
    props,
    usdcMintMissing,
    txStatus,
    usdcBalance,
    auth,
    walletAddress,
  })
})

onBeforeUnmount(() => {
  destroyPickers(startPicker, endPicker)
})
</script>

<template>
  <div class="modal">
    <header class="modal-head">
      <div>
        <p class="eyebrow">New contract</p>
        <h3>Generate a smart contract</h3>
        <p class="muted">Set financial details and validation checkpoints to launch escrow.</p>
      </div>
      <button class="close" type="button" @click="close">x</button>
    </header>

    <div class="grid">
      <label class="field">
        <span>Title</span>
        <input v-model="form.title" placeholder="e.g., L2 Audit November" />
      </label>

      <label class="field">
        <span>Freelancer</span>
        <div class="select-shell">
          <select v-model="form.employer">
            <option disabled value="">Select a freelancer</option>
            <option v-for="client in employers" :key="client.uuid" :value="client">
              {{ client.label || client.username || client.wallet_address }}
            </option>
          </select>
        </div>

        <div v-if="form.employer" class="muted" style="margin-top: 6px; font-size: 12px;">
          <div><b>UUID:</b> {{ form.employer.uuid }}</div>
          <div><b>Wallet:</b> {{ form.employer.wallet_address || form.employer.walletAddress }}</div>
        </div>
      </label>

      <label class="field full">
        <span>Amount (USDC)</span>
        <input
          v-model="form.amountUsdc"
          type="number"
          min="0"
          step="0.000001"
          placeholder="e.g., 2500"
        />
        <p class="muted">USDC Balance: {{ Number(usdcBalance || 0).toFixed(2) }} USDC</p>
      </label>

      <div class="field date-grid">
        <label>
          <span>Start date</span>
          <input ref="startInput" type="text" placeholder="Select a date" readonly />
        </label>

        <label>
          <span>End date</span>
          <input ref="endInput" type="text" placeholder="Select a date" readonly />
        </label>
      </div>

      <label class="field full">
        <span>Description</span>
        <textarea v-model="form.description" rows="3" placeholder="Contract scope, deliverables, etc." />
      </label>

      <label class="field full">
        <span>Validation checkpoints</span>
        <textarea v-model="form.checkpoints" rows="3" placeholder="List milestones the client must approve." />
      </label>
    </div>

    <footer class="actions">
      <div class="status" v-if="txStatus">{{ txStatus }}</div>
      <button class="ghost" type="button" @click="close">Cancel</button>
      <button class="primary" type="button" :disabled="!canSubmit" @click="submitForm">
        {{ loading ? "Creating..." : "Create contract" }}
      </button>
    </footer>
  </div>
</template>

<style scoped>
select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background: transparent !important;
  background-image: none !important;
}

.select-shell {
  position: relative;
  width: 100%;
}

.select-shell::after {
  content: "↓";
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #d9c5ff;
  font-size: 15px;
  opacity: 0.85;
}

.select-shell select {
  width: 100%;
  display: block;
  border-radius: 12px;
  border: 1px solid rgba(120, 90, 255, 0.28);
  background: rgba(255, 255, 255, 0.04);
  padding: 10px 14px;
  padding-right: 34px;
  color: #eae7ff;
  font-size: 14px;
  cursor: pointer;
}

.select-shell select:focus {
  outline: none;
  border-color: rgba(120, 90, 255, 0.55);
  background: rgba(255, 255, 255, 0.08);
}

.select-shell select option {
  background: #0a0f24;
  color: #eae7ff;
}

.modal {
  width: min(640px, 100%);
  background: radial-gradient(circle at 20% 20%, rgba(120, 90, 255, 0.15), transparent 45%),
    rgba(6, 10, 24, 0.95);
  border-radius: 22px;
  border: 1px solid rgba(120, 90, 255, 0.35);
  padding: 20px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), 0 0 28px rgba(120, 90, 255, 0.35);
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
.field textarea {
  border-radius: 12px;
  border: 1px solid rgba(120, 90, 255, 0.28);
  background: rgba(255, 255, 255, 0.04);
  padding: 10px 12px;
  color: #eae7ff;
  font-size: 14px;
}

textarea {
  resize: vertical;
}

.date-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  align-items: center;
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

.status {
  margin-right: auto;
  font-size: 12px;
  color: #9fb0d2;
}
</style>
