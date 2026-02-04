<!-- src/components/ContractPreviewModal.vue -->
<script setup>
import { computed, ref } from "vue"
import { PublicKey } from "@solana/web3.js"

import api from "../services/api"
import { useAuthStore } from "../store/auth"

import {
  connectPhantom,
  getAnchorProvider,
  getConnection,
  getPhantomProvider,
  loadProgram,
  openDispute,
} from "../services/solana"

import rawIdl from "../idl/escrow_program.json"

const props = defineProps({
  contract: { type: Object, required: true },
  programId: String,
  rpcUrl: String,
  admin1: String,
  admin2: String,
})

const emit = defineEmits(["close", "updated"])
const close = () => emit("close")

const auth = useAuthStore()
const loading = ref(false)
const txStatus = ref("")

const pick = (keys) => keys.map((k) => props.contract?.[k]).find((v) => v != null)

/** ✅ contract uuid (ton controller utilise {uuid}) */
const contractUuid = computed(() => pick(["uuid"]))

/** status en majuscule */
const status = computed(() => String(pick(["status"]) || "").toUpperCase())

/** PDAs */
const escrowStatePda = computed(() => pick(["escrowStatePda", "escrow_state_pda"]))

/** wallets (ton serializer renvoie employer/freelancer objects) */
const employerWallet = computed(() => props.contract?.employer?.walletAddress || pick(["employerWallet", "employer_wallet"]))
const freelancerWallet = computed(() => props.contract?.freelancer?.walletAddress || pick(["freelancerWallet", "freelancer_wallet"]))

const admin1Wallet = computed(() => props.admin1 || pick(["adminOneWallet", "admin_one_wallet", "admin1"]))
const admin2Wallet = computed(() => props.admin2 || pick(["adminTwoWallet", "admin_two_wallet", "admin2"]))
const programId = computed(() => props.programId || pick(["programId", "program_id"]))

const isEmployer = computed(() => !!auth.user?.walletAddress && auth.user.walletAddress === employerWallet.value)
const isFreelancer = computed(() => !!auth.user?.walletAddress && auth.user.walletAddress === freelancerWallet.value)
const isAdmin = computed(() => {
  const w = auth.user?.walletAddress
  if (!w) return false
  return w === admin1Wallet.value || w === admin2Wallet.value
})

/** règles */
const canDispute = computed(() =>
  (isEmployer.value || isFreelancer.value) &&
  ["IN_PROGRESS", "DONE_PENDING", "READY_TO_RELEASE"].includes(status.value)
)

/** ✅ format date en anglais (UK) */
function formatDateEn(value) {
  if (!value) return "-"
  const d = new Date(value) // ISO DATE_ATOM -> OK
  if (Number.isNaN(d.getTime())) return "-"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d)
}

/** dates ISO renvoyées par ton serializer */
const startAt = computed(() => pick(["startAt", "start_at"]))
const endAt = computed(() => pick(["endAt", "end_at"]))
const createdAt = computed(() => pick(["createdAt", "created_at"]))

const createdAtLabel = computed(() => formatDateEn(createdAt.value))

const periodLabel = computed(() => {
  const s = formatDateEn(startAt.value)
  const e = formatDateEn(endAt.value)
  if (s === "-" && e === "-") return "-"
  return `${s} → ${e}`
})

const humanAmount = computed(() => {
  const amount = pick(["amountUsdc", "amount_usdc", "amount"])
  if (amount == null) return "-"
  return `${Number(amount).toFixed(2)} USDC`
})

const checkpointsLabel = computed(() => {
  const checkpoints = pick(["checkpoints"])
  if (Array.isArray(checkpoints)) return checkpoints.filter(Boolean).join("\n")
  return checkpoints || "No checkpoints provided."
})

const ensurePhantom = async () => {
  const phantom = getPhantomProvider()
  if (!phantom) throw new Error("Phantom not detected.")
  const { publicKey } = await connectPhantom()
  if (!publicKey) throw new Error("Wallet not found.")
  const expectedWallet = auth.user?.walletAddress
  const connectedWallet = publicKey.toBase58()
  if (expectedWallet && expectedWallet !== connectedWallet) {
    throw new Error("Phantom wallet is different from the connected account.")
  }
  return { phantom, publicKey }
}

const getProgramContext = async ({ phantom, publicKey }) => {
  if (!programId.value) throw new Error("Missing programId.")
  const connection = getConnection(props.rpcUrl)
  const wallet = {
    publicKey,
    signTransaction: phantom.signTransaction.bind(phantom),
    signAllTransactions: phantom.signAllTransactions.bind(phantom),
  }
  const provider = getAnchorProvider(connection, wallet)
  const program = loadProgram(rawIdl, programId.value, provider)
  return { program }
}

const toPublicKeyStrict = (value, label) => {
  if (!value) throw new Error(`${label} missing.`)
  return new PublicKey(value)
}

const notifyBackendDispute = async (signature) => {
  if (!contractUuid.value) throw new Error("Missing contract uuid.")
  await api.post(`/contracts/${contractUuid.value}/dispute`, { txSig: signature })
  emit("updated")
}

const withAction = async (label, action) => {
  try {
    loading.value = true
    txStatus.value = label
    const sig = await action()
    txStatus.value = "Transaction sent."
    return sig
  } catch (e) {
    console.error(label, e)
    alert(e?.message || "Transaction failed.")
  } finally {
    loading.value = false
  }
}

const handleDispute = () =>
  withAction("Signing dispute...", async () => {
    const ctx = await ensurePhantom()
    const { program } = await getProgramContext(ctx)

    const signature = await openDispute({
      program,
      signer: ctx.publicKey,
      escrowStatePda: toPublicKeyStrict(escrowStatePda.value, "escrow_state_pda"),
    })

    await notifyBackendDispute(signature)
    return signature
  })
</script>

<template>
  <div class="modal">
    <header class="modal-head">
      <div>
        <p class="eyebrow">Contract Preview</p>
        <h3>{{ contract.title || contract.name }}</h3>
        <p class="muted">
          {{ contract?.freelancer?.username || contract?.freelancer?.walletAddress || " " }}
        </p>
      </div>
      <button class="close" type="button" @click="close">x</button>
    </header>

    <div class="grid">
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
