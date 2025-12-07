<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue"
import flatpickr from "flatpickr"
import "flatpickr/dist/themes/dark.css"
import { PublicKey } from "@solana/web3.js"
import api from "../services/api"
import idl from "../idl/escrow_program.json"
import {
  connectPhantom,
  findEscrowPdas,
  getAnchorProvider,
  getConnection,
  getPhantomProvider,
  getUsdcBalance,
  initializeEscrow,
  loadProgram,
} from "../services/solana"

const props = defineProps({
  employers: Array, // [{ uuid, label, walletAddress }]
  freelancerWallet: String,
  programId: String,
  usdcMint: String,
  network: String,
  rpcUrl: String,
  admin1: String,
  admin2: String,
})

const emit = defineEmits(["close", "created"])

const form = reactive({
  title: "",
  description: "",
  checkpoints: "",
  timeline: { start: "", end: "" },
  employer: null,
  price: 0,
})

const startInput = ref(null)
const endInput = ref(null)
let startPicker = null
let endPicker = null

const loading = ref(false)
const txStatus = ref("")
const usdcBalance = ref(0)
const initializerAta = ref(null)
const walletAddress = ref("")

const usdcMintMissing = computed(() => !props.usdcMint)
const programIdMissing = computed(() => !props.programId)
const phantomReady = computed(() => !!walletAddress.value)

const todayIso = computed(() => new Date().toISOString().split("T")[0])

const canSubmit = computed(() => {
  return (
    form.title &&
    form.description &&
    form.checkpoints &&
    form.employer &&
    Number(form.price) > 0 &&
    form.timeline.start &&
    form.timeline.end &&
    !loading.value &&
    !usdcMintMissing.value &&
    !programIdMissing.value
  )
})

const normalizeIso = (date) => {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().split("T")[0]
}

function syncEndMinDate() {
  if (!endPicker) return
  endPicker.set("minDate", form.timeline.start)
  if (form.timeline.end && form.timeline.end < form.timeline.start) {
    form.timeline.end = form.timeline.start
    endPicker.setDate(form.timeline.end)
  }
}

async function ensurePhantom() {
  const phantom = getPhantomProvider()
  if (!phantom) {
    txStatus.value = "Installe Phantom."
    throw new Error("Phantom manquant")
  }
  const { publicKey } = await connectPhantom()
  walletAddress.value = publicKey?.toBase58() || ""
  return { phantom, publicKey }
}

async function loadUsdcBalance() {
  try {
    if (usdcMintMissing.value) {
      txStatus.value = "Mint USDC manquant."
      return
    }

    txStatus.value = "Connexion Phantom..."
    const { publicKey } = await ensurePhantom()
    if (!publicKey) {
      txStatus.value = "Wallet requis."
      return
    }

    const connection = getConnection(props.rpcUrl)
    txStatus.value = "Lecture du solde USDC..."
    const balanceInfo = await getUsdcBalance({
      wallet: publicKey,
      mintAddress: props.usdcMint,
      connection,
    })

    initializerAta.value = balanceInfo.ata
    usdcBalance.value = balanceInfo.amount
    txStatus.value = ""
  } catch (e) {
    console.error("Balance Error:", e)
    txStatus.value = "Erreur solde USDC. Voir console."
    usdcBalance.value = 0
  }
}

async function submitForm() {
  if (!canSubmit.value) return
  if (form.timeline.start < todayIso.value) return alert("Start date invalid.")
  if (form.timeline.end && form.timeline.end < form.timeline.start) {
    return alert("End date must be after start date.")
  }

  try {
    loading.value = true
    txStatus.value = "Connexion Phantom..."

    const { phantom, publicKey } = await ensurePhantom()
    if (!publicKey) {
      alert("Connexion wallet requise.")
      return
    }

    if (
      form.employer.walletAddress &&
      form.employer.walletAddress !== publicKey.toBase58()
    ) {
      alert("Le wallet connecté ne correspond pas à l'employeur sélectionné.")
      return
    }

    if (usdcMintMissing.value || programIdMissing.value) {
      alert("Mint USDC ou ProgramId manquant.")
      return
    }

    const connection = getConnection(props.rpcUrl)
    const provider = getAnchorProvider(connection, phantom)
    const program = loadProgram(idl, props.programId, provider)
    const workerPk = new PublicKey(props.freelancerWallet)
    const admin1Pk = props.admin1 ? new PublicKey(props.admin1) : publicKey
    const admin2Pk = props.admin2 ? new PublicKey(props.admin2) : publicKey
    const { escrowStatePda, vaultPda } = await findEscrowPdas(
      program.programId,
      publicKey,
      workerPk,
    )

    const ataAddress = initializerAta.value
    if (!ataAddress) {
      txStatus.value = "ATA USDC introuvable pour l'employeur."
      return
    }

    txStatus.value = "On-chain: initialize_escrow..."
    const signature = await initializeEscrow({
      program,
      amountUsdc: form.price,
      initializer: publicKey,
      worker: workerPk,
      admin1: admin1Pk,
      admin2: admin2Pk,
      usdcMint: new PublicKey(props.usdcMint),
      initializerUsdcAta: ataAddress,
      vaultPda,
      escrowStatePda,
      feeBps: 500,
    })

    txStatus.value = "Enregistrement backend..."

    const res = await api.post("/escrows/create", {
      title: form.title,
      description: form.description,
      checkpoints: form.checkpoints
        ? form.checkpoints.split("\n").map((c) => c.trim()).filter(Boolean)
        : [],
      timeline: form.timeline,
      amountUsdc: form.price,
      employerUuid: form.employer.uuid,
      employerWallet: publicKey.toBase58(),
      freelancerWallet: props.freelancerWallet,
      programId: props.programId,
      usdcMint: props.usdcMint,
      network: props.network,
      escrowStatePda: escrowStatePda.toBase58(),
      vaultPda: vaultPda.toBase58(),
      txSignature: signature,
    })

    txStatus.value = "Contrat créé."

    emit("created", res.data)
  } catch (err) {
    console.error(err)
    alert("Erreur lors de la création du contrat.")
  } finally {
    loading.value = false
  }
}

function close() {
  emit("close")
}

onMounted(() => {
  startPicker = flatpickr(startInput.value, {
    dateFormat: "M d, Y",
    minDate: "today",
    onChange: (d) => {
      form.timeline.start = normalizeIso(d[0])
      syncEndMinDate()
    },
  })

  endPicker = flatpickr(endInput.value, {
    dateFormat: "M d, Y",
    onChange: (d) => {
      form.timeline.end = normalizeIso(d[0])
    },
  })

  loadUsdcBalance()
})

onBeforeUnmount(() => {
  startPicker?.destroy()
  endPicker?.destroy()
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
        <span>Assign to</span>
        <div class="select-shell">
          <select v-model="form.employer">
            <option value="" disabled>Select a client</option>
            <option
              v-for="client in employers"
              :key="client.uuid"
              :value="client"
            >
              {{ client.label }}
            </option>
          </select>
        </div>
      </label>

      <label class="field">
        <span>Total budget (USDC)</span>

        <div class="funds-shell">
          <div class="funds-header">
            <p class="funds-label">USDC balance</p>
            <p class="funds-balance">{{ usdcBalance.toFixed(2) }} USDC</p>
          </div>
          <p v-if="usdcMintMissing" class="warning">Mint USDC manquant.</p>
          <p v-if="txStatus && txStatus.includes('réseau')" class="warning">{{ txStatus }}</p>

          <input
            type="range"
            min="0"
            :max="usdcBalance || 0"
            step="0.01"
            v-model.number="form.price"
          />

          <div class="funds-value">
            <input
              type="number"
              min="0"
              :max="usdcBalance || 0"
              step="0.01"
              v-model.number="form.price"
            />
            <span>USDC</span>
            <button class="refresh" type="button" @click="loadUsdcBalance">↺</button>
          </div>
        </div>
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
        <textarea
          v-model="form.description"
          rows="3"
          placeholder="Contract scope, deliverables, etc."
        />
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
      <div class="status" v-if="txStatus">
        {{ txStatus }}
      </div>
      <button class="ghost" type="button" @click="close">Cancel</button>
      <button class="primary" type="button" :disabled="!canSubmit" @click="submitForm">
        {{ loading ? "Creating..." : "Create contract" }}
      </button>
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

.select-shell {
  position: relative;
}

.select-shell::after {
  content: "↓";
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

.funds-shell {
  border-radius: 14px;
  padding: 10px 12px;
  background: radial-gradient(circle at 10% 0%, rgba(120, 90, 255, 0.15), transparent 55%),
    rgba(6, 10, 24, 0.7);
  border: 1px solid rgba(120, 90, 255, 0.3);
  display: grid;
  gap: 6px;
}

.funds-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.funds-label {
  color: #9fb0d2;
}

.funds-balance {
  color: #e2ecff;
}

.funds-shell input[type="range"] {
  width: 100%;
}

.funds-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.funds-value input {
  flex: 1;
}

.funds-value span {
  font-size: 12px;
  color: #cfd8ff;
}

.refresh {
  border: 1px solid rgba(120, 90, 255, 0.4);
  background: rgba(255, 255, 255, 0.05);
  color: #dfe7ff;
  border-radius: 8px;
  padding: 6px 8px;
  cursor: pointer;
}

.status {
  margin-right: auto;
  font-size: 12px;
  color: #9fb0d2;
}

.warning {
  color: #f4c2c2;
  font-size: 12px;
}
</style>
