<!-- src/components/ContractPreviewModal.vue -->
<script setup>
import { computed, ref } from "vue"
import { useAuthStore } from "../store/auth"

import { useContractPreviewSelectors } from "../createContract/selectors"
import { useContractPreviewLabels } from "../createContract/formatters"
import { useContractPreviewPermissions } from "../createContract/permissions"
import { createWithAction } from "../createContract/withAction"
import { createHandleDispute } from "../createContract/disputeAction"

const props = defineProps({
  contract: { type: Object, required: true },
  programId: String,
  rpcUrl: String,
  admin1: String,
  admin2: String,
  admin1FeeAta: String,
  admin2FeeAta: String,
})

const emit = defineEmits(["close", "updated"])
const close = () => emit("close")
const isGeneratedContractTitle = (value) =>
  /^contract\s+[0-9a-f-]{16,}$/i.test(String(value || "").trim())

const contractNumber = computed(() => {
  const id = props.contract?.uuid || props.contract?.id || ""
  return id ? `Contract ${id}` : "Contract"
})

const contractTitle = computed(() => {
  const raw =
    props.contract?.title ||
    props.contract?.contractTitle ||
    props.contract?.contract_title ||
    props.contract?.name ||
    props.contract?.jobTitle ||
    props.contract?.job_title ||
    ""
  const title = String(raw).trim()
  if (!title || isGeneratedContractTitle(title)) return "-"
  return title
})

const auth = useAuthStore()
const loading = ref(false)
const txStatus = ref("")

// -------------------------
// selectors (pick + computed base)
// -------------------------
const {
  pick,
  contractUuid,
  status,
  escrowStatePda,
  employerWallet,
  freelancerWallet,
  admin1Wallet,
  admin2Wallet,
  programId,
  startAt,
  endAt,
  createdAt,
} = useContractPreviewSelectors(props)

// -------------------------
// permissions (isEmployer/isFreelancer/isAdmin + canDispute)
// -------------------------
const { isEmployer, isFreelancer, isAdmin, canDispute } = useContractPreviewPermissions({
  auth,
  employerWallet,
  freelancerWallet,
  admin1Wallet,
  admin2Wallet,
  status,
})

// -------------------------
// labels (format date / amount / checkpoints / period)
// -------------------------
const { createdAtLabel, periodLabel, humanAmount, checkpointsLabel } = useContractPreviewLabels({
  pick,
  startAt,
  endAt,
  createdAt,
})

// -------------------------
// action wrapper (withAction)
// -------------------------
const withAction = createWithAction({ loading, txStatus })

// -------------------------
// dispute handler
// -------------------------
const handleDispute = createHandleDispute({
  props,
  emit,
  auth,
  withAction,
  contractUuid,
  escrowStatePda,
  programId,
})
</script>

<template>
  <div class="modal">
    <header class="modal-head">
      <div>
        <p class="eyebrow">Contract Preview</p>
        <h3>{{ contractNumber }}</h3>
        <p class="muted">
          {{ contract?.freelancer?.username || contract?.freelancer?.walletAddress || " " }}
        </p>
      </div>
      <button class="close" type="button" @click="close">x</button>
    </header>

    <div class="grid">
      <article class="info full">
        <p class="label">Title</p>
        <p class="value">{{ contractTitle }}</p>
      </article>

      <article class="info">
        <p class="label">Amount</p>
        <p class="value">{{ humanAmount }}</p>
      </article>

      <article class="info">
        <p class="label">Created</p>
        <p class="value">{{ createdAtLabel }}</p>
      </article>

      <article class="info">
        <p class="label">Period</p>
        <p class="value">{{ periodLabel }}</p>
      </article>

      <article class="info">
        <p class="label">Status</p>
        <p class="value status">{{ contract.status }}</p>
      </article>

      <article class="info full">
        <p class="label">Description</p>
        <p class="body">{{ contract.description || "No description provided." }}</p>
      </article>

      <article class="info full">
        <p class="label">Validation checkpoints</p>
        <p class="body" style="white-space: pre-wrap">{{ checkpointsLabel }}</p>
      </article>
    </div>

    <section class="actions">
      <p class="label">Actions</p>

      <div class="actions-grid">
        <button class="btn warn" type="button" :disabled="!canDispute || loading" @click="handleDispute">
          Open dispute
        </button>
      </div>

      <p v-if="txStatus" class="status">{{ txStatus }}</p>
    </section>
  </div>
</template>

<style scoped>
.modal {
  width: min(560px, 100%);
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

.actions {
  display: grid;
  gap: 8px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
}

.btn {
  border-radius: 12px;
  border: 1px solid transparent;
  padding: 10px 12px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn.primary {
  background: linear-gradient(90deg, #6a48ff, #00c6ff);
  color: #061227;
}

.btn.ghost {
  background: rgba(120, 90, 255, 0.12);
  border-color: rgba(120, 90, 255, 0.35);
  color: #dfe7ff;
}

.btn.warn {
  background: rgba(243, 194, 107, 0.16);
  border-color: rgba(243, 194, 107, 0.45);
  color: #f3c26b;
}

.btn.admin {
  background: rgba(93, 176, 255, 0.15);
  border-color: rgba(93, 176, 255, 0.45);
  color: #9ad1ff;
}

.status {
  color: #7c8db2;
  font-size: 13px;
}
</style>
