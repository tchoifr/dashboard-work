<!-- src/components/ContractPreviewModal.vue -->
<script setup>
import { computed, onMounted, ref, watch } from "vue"
import { useAuthStore } from "../store/auth"
import {
  getContract as getContractApi,
  openDispute as openDisputeApi,
  resolveDispute as resolveDisputeApi,
  voteDispute as voteDisputeApi,
} from "../services/contractsApi"

import { useContractPreviewSelectors } from "../createContract/selectors"
import { useContractPreviewLabels } from "../createContract/formatters"
import { useContractPreviewPermissions } from "../createContract/permissions"
import { createWithAction } from "../createContract/withAction"

const props = defineProps({
  contract: { type: Object, required: true },
  adminReadonly: { type: Boolean, default: false },
  programId: String,
  rpcUrl: String,
  admin1: String,
  admin2: String,
  admin1UserUuid: String,
  admin2UserUuid: String,
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
const disputeLoading = ref(false)
const disputeReason = ref("")
const resolveTxSig = ref("")
const voteState = ref(null)
const disputeState = ref(null)

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
const admin1UserUuid = computed(() => props.admin1UserUuid || null)
const admin2UserUuid = computed(() => props.admin2UserUuid || null)

// -------------------------
// permissions (isEmployer/isFreelancer/isAdmin + canDispute)
// -------------------------
const { isEmployer, isFreelancer, isAdmin, canDispute } = useContractPreviewPermissions({
  auth,
  employerWallet,
  freelancerWallet,
  admin1Wallet,
  admin2Wallet,
  admin1UserUuid,
  admin2UserUuid,
  status,
})
const normalizeComparable = (value) => String(value || "").trim().toLowerCase()
const isDisputeAdminByUuid = computed(() => {
  const userUuid =
    auth.user?.uuid ||
    auth.user?.userUuid ||
    auth.user?.id ||
    auth.userUuid ||
    null
  const adminUuids = [admin1UserUuid.value, admin2UserUuid.value]
    .map(normalizeComparable)
    .filter(Boolean)
  if (!adminUuids.length) return isAdmin.value
  return adminUuids.includes(normalizeComparable(userUuid))
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

const normalizeDispute = (raw) => {
  if (!raw || typeof raw !== "object") return null
  const status = String(raw.status || raw.disputeStatus || "").toUpperCase()
  return {
    ...raw,
    id: raw.id ?? raw.disputeId ?? raw.dispute_id ?? null,
    status,
    reason: raw.reason || raw.message || "",
    myVote: raw.myVote || raw.my_vote || null,
    canResolve: Boolean(raw.canResolve ?? raw.can_resolve),
    resolutionType: raw.resolutionType || raw.resolution_type || null,
    amounts: raw.amounts || null,
  }
}

const loadDisputeState = async () => {
  if (props.adminReadonly) return
  if (!contractUuid.value) return
  disputeLoading.value = true
  try {
    const data = await getContractApi(contractUuid.value)
    const contractPayload =
      data?.contract && typeof data.contract === "object" ? data.contract : data || {}
    const dispute = contractPayload?.dispute ?? data?.dispute ?? null
    disputeState.value = normalizeDispute(dispute)
  } catch (error) {
    console.error("Failed to load dispute state", error)
  } finally {
    disputeLoading.value = false
  }
}

const disputeId = computed(
  () =>
    disputeState.value?.id ||
    props.contract?.dispute?.id ||
    props.contract?.disputeId ||
    props.contract?.dispute_id ||
    null,
)
const hasDispute = computed(() => !!disputeId.value)
const disputeStatus = computed(() => String(disputeState.value?.status || "").toUpperCase())
const isDisputeOpen = computed(
  () => hasDispute.value && !["RESOLVED", "CLOSED", "CANCELLED"].includes(disputeStatus.value),
)
const canResolve = computed(() => Boolean(voteState.value?.canResolve || disputeState.value?.canResolve))
const myVote = computed(() => voteState.value?.myVote || disputeState.value?.myVote || null)
const resolutionType = computed(
  () => disputeState.value?.resolutionType || disputeState.value?.resolution_type || null,
)
const resolutionAmounts = computed(() => disputeState.value?.amounts || null)

const handleDispute = () =>
  withAction("Opening dispute...", async () => {
    if (!contractUuid.value) throw new Error("Contract UUID introuvable.")
    await openDisputeApi(contractUuid.value, String(disputeReason.value || ""))
    await loadDisputeState()
    emit("updated")
    return true
  })

const handleValidateContract = () => {
  txStatus.value = "Contract validated."
  emit("updated")
}

const handleAdminVote = (vote) =>
  withAction(`Voting ${vote}...`, async () => {
    if (!disputeId.value) throw new Error("Dispute ID introuvable.")
    const result = await voteDisputeApi(disputeId.value, vote)
    voteState.value = result
    await loadDisputeState()
    return true
  })

const handleResolveDispute = () =>
  withAction("Resolving dispute...", async () => {
    if (!disputeId.value) throw new Error("Dispute ID introuvable.")
    const txSig = String(resolveTxSig.value || "").trim()
    if (!txSig) throw new Error("txSig requis pour résoudre le litige.")
    const result = await resolveDisputeApi(disputeId.value, { txSig })
    disputeState.value = normalizeDispute({
      ...(disputeState.value || {}),
      status: result?.status || "RESOLVED",
      resolutionType: result?.resolutionType || null,
      amounts: result?.amounts || null,
    })
    resolveTxSig.value = ""
    voteState.value = null
    await loadDisputeState()
    emit("updated")
    return true
  })

watch(
  () => contractUuid.value,
  () => {
    if (props.adminReadonly) return
    voteState.value = null
    disputeState.value = null
    resolveTxSig.value = ""
    disputeReason.value = ""
    loadDisputeState()
  },
  { immediate: true },
)

onMounted(() => {
  if (!props.adminReadonly) loadDisputeState()
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

    <section v-if="!props.adminReadonly" class="actions">
      <p class="label">Actions</p>

      <div class="actions-grid">
        <button class="btn nav" type="button" :disabled="loading" @click="handleValidateContract">
          Validate Contract
        </button>
        <button
          class="btn warn"
          type="button"
          :disabled="!canDispute || loading || hasDispute"
          @click="handleDispute"
        >
          Open dispute
        </button>
      </div>

      <textarea
        v-model="disputeReason"
        class="reason-input"
        rows="2"
        placeholder="Reason (optional)"
      />

      <section class="dispute-box">
        <p class="label">Dispute</p>
        <p class="value">
          {{ hasDispute ? `#${disputeId} - ${disputeStatus || "OPEN"}` : "No dispute on this contract" }}
        </p>
        <p v-if="disputeState?.reason" class="status">Reason: {{ disputeState.reason }}</p>
        <p v-if="myVote" class="status">My vote: {{ myVote }}</p>
        <p v-if="canResolve && isDisputeOpen" class="status ok">2 matching admin votes detected: resolvable.</p>
        <p v-if="hasDispute && isDisputeOpen && !isDisputeAdminByUuid" class="status">
          Seuls les admins autorisés peuvent voter/résoudre.
        </p>
        <p v-if="disputeLoading" class="status">Refreshing dispute state...</p>

        <div v-if="hasDispute && isDisputeOpen && isDisputeAdminByUuid" class="actions-grid">
          <button class="btn admin" type="button" :disabled="loading" @click="handleAdminVote('EMPLOYER')">
            Vote employer
          </button>
          <button class="btn admin" type="button" :disabled="loading" @click="handleAdminVote('FREELANCER')">
            Vote freelancer
          </button>
          <button class="btn admin" type="button" :disabled="loading" @click="handleAdminVote('SPLIT')">
            Vote split
          </button>
        </div>

        <div v-if="hasDispute && isDisputeOpen && isDisputeAdminByUuid" class="resolve-grid">
          <input
            v-model="resolveTxSig"
            class="tx-input"
            type="text"
            placeholder="txSig required for /resolve"
          />
          <button class="btn primary" type="button" :disabled="loading || !canResolve" @click="handleResolveDispute">
            Resolve dispute
          </button>
        </div>

        <div v-if="resolutionType || resolutionAmounts" class="resolution-box">
          <p class="label">Resolution</p>
          <p class="value">{{ resolutionType || "RESOLVED" }}</p>
          <p v-if="resolutionAmounts?.feeDispute" class="status">feeDispute: {{ resolutionAmounts.feeDispute }}</p>
          <p v-if="resolutionAmounts?.feeByhnex" class="status">feeByhnex: {{ resolutionAmounts.feeByhnex }}</p>
          <p v-if="resolutionAmounts?.toEmployer" class="status">toEmployer: {{ resolutionAmounts.toEmployer }}</p>
          <p v-if="resolutionAmounts?.toFreelancer" class="status">
            toFreelancer: {{ resolutionAmounts.toFreelancer }}
          </p>
        </div>
      </section>

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
  max-height: calc(100vh - 32px);
  overflow-y: auto;
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
  overflow-wrap: anywhere;
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
  overflow-wrap: anywhere;
  word-break: break-word;
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

.dispute-box {
  border: 1px solid rgba(120, 90, 255, 0.24);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  display: grid;
  gap: 6px;
}

.reason-input,
.tx-input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(120, 90, 255, 0.35);
  background: rgba(7, 14, 28, 0.9);
  color: #dfe7ff;
  padding: 8px 10px;
}

.resolve-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
}

.resolution-box {
  border-top: 1px solid rgba(120, 90, 255, 0.24);
  margin-top: 6px;
  padding-top: 8px;
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

.btn.nav {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(120, 90, 255, 0.18);
  color: #9babc8;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25);
}

.btn.nav:hover:not(:disabled) {
  color: #dfe7ff;
  border-color: rgba(120, 90, 255, 0.3);
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

.status.ok {
  color: #7bd38f;
}
</style>
