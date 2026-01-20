<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue"
import flatpickr from "flatpickr"
import "flatpickr/dist/themes/dark.css"
import { PublicKey, SystemProgram } from "@solana/web3.js"
import api from "../services/api"
import idl from "../idl/escrow_program.json"
import { useAuthStore } from "../store/auth"

import {
  connectPhantom,
  getAnchorProvider,
  getConnection,
  getPhantomProvider,
  getUsdcBalance,
  getOrCreateAta,
  findEscrowPdas,
  initializeEscrow,
  loadProgram,
} from "../services/solana"

// --------------------------------------------------
// PROPS / EMITS / STORE
// --------------------------------------------------
const props = defineProps({
  employers: Array,
  freelancerWallet: String,
  programId: String,
  usdcMint: String,
  network: String,
  rpcUrl: String,
  feeWallet: String,
  admin1: String,
  admin2: String,
})

const emit = defineEmits(["close", "created"])
const auth = useAuthStore()

// --------------------------------------------------
// ADMIN KEYS
// --------------------------------------------------
const admin1Key = computed(() =>
  props.admin1 && props.admin1.length > 0
    ? new PublicKey(props.admin1)
    : SystemProgram.programId
)

const admin2Key = computed(() =>
  props.admin2 && props.admin2.length > 0
    ? new PublicKey(props.admin2)
    : SystemProgram.programId
)

// --------------------------------------------------
// FORMULAIRE
// --------------------------------------------------
const form = reactive({
  title: "",
  description: "",
  checkpoints: "",
  timeline: { start: "", end: "" },
  employer: null,
  amountUsdc: "",
})

// --------------------------------------------------
// PICKER DATES
// --------------------------------------------------
const startInput = ref(null)
const endInput = ref(null)
let startPicker = null
let endPicker = null

// --------------------------------------------------
// STATE UI
// --------------------------------------------------
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
  const amount = Number(form.amountUsdc)
  return (
    form.title &&
    form.description &&
    form.checkpoints &&
    form.employer &&
    form.timeline.start &&
    form.timeline.end &&
    Number.isFinite(amount) &&
    amount > 0 &&
    !loading.value &&
    !usdcMintMissing.value &&
    !programIdMissing.value
  )
})

// --------------------------------------------------
// UTILS
// --------------------------------------------------
const normalizeIso = (date) => {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().split("T")[0]
}

function syncEndMinDate() {
  if (!endPicker) return
  endPicker.set("minDate", form.timeline.start || null)
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

// --------------------------------------------------
// SOLDE USDC
// --------------------------------------------------
async function loadUsdcBalance() {
  try {
    if (usdcMintMissing.value) return

    txStatus.value = "Connexion Phantom..."
    const { publicKey } = await ensurePhantom()
    if (!publicKey) return

    try {
      new PublicKey(props.programId)
    } catch (error) {
      console.error("ProgramId invalide:", props.programId, error)
      return alert("ProgramId invalide. Contacte un admin.")
    }

    try {
      new PublicKey(props.usdcMint)
    } catch (error) {
      console.error("USDC mint invalide:", props.usdcMint, error)
      return alert("USDC mint invalide.")
    }

    const connection = getConnection(props.rpcUrl)
    txStatus.value = "Lecture solde USDC..."

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
    txStatus.value = "Erreur solde USDC."
    usdcBalance.value = 0
  }
}

// --------------------------------------------------
// SUBMIT FORM + TX SOLANA
// --------------------------------------------------
async function submitForm() {
  if (!canSubmit.value) return

  try {
    loading.value = true
    txStatus.value = "Connexion Phantom..."

    const { phantom, publicKey } = await ensurePhantom()
    if (!publicKey) return alert("Wallet requis.")

    if (
      !props.programId ||
      props.programId === SystemProgram.programId.toBase58()
    ) {
      return alert("ProgramId invalide. Contacte un admin.")
    }

    const employerWallet = publicKey.toBase58()
    const employerUuid = auth.user?.uuid
    if (!employerUuid) return alert("Utilisateur employeur introuvable.")

    const freelancerWallet =
      form.employer?.walletAddress || form.employer?.wallet_address
    if (!freelancerWallet) return alert("Wallet du freelance manquant.")

    // Connection / Provider / Program
    const connection = getConnection(props.rpcUrl)
    const provider = getAnchorProvider(connection, phantom)

    // DEBUG (tu peux enlever après)
    console.log("👛 provider.wallet =", provider.wallet.publicKey.toBase58())
    console.log("👛 ensurePhantom publicKey =", publicKey.toBase58())

    // Anchor 0.30+: Program(idl, provider)
    const program = loadProgram(idl, provider)

    const workerPk = new PublicKey(freelancerWallet)
    const admin1Pk = admin1Key.value
    const admin2Pk = admin2Key.value
    const amountUsdc = Number(form.amountUsdc)

    // PDAs
    const { escrowStatePda, vaultPda } = await findEscrowPdas(
      props.programId,
      publicKey,
      workerPk
    )

    // ATA USDC de l'initializer (payer = wallet Phantom connecté)
    const { ata: initializerUsdcAta } = await getOrCreateAta({
      connection,
      provider,
      payer: provider.wallet.publicKey, // ✅ PAYEUR
      owner: publicKey,                 // ✅ OWNER (initializer)
      mint: new PublicKey(props.usdcMint),
    })

    // Checkpoints
    const checkpointsArray = form.checkpoints
      ? form.checkpoints
          .split("\n")
          .map((c) => c.trim())
          .filter(Boolean)
      : []

    // 1) Initialize on-chain
    txStatus.value = "Signature initialize_escrow..."
    const signature = await initializeEscrow({
      program,
      amountUsdc,
      initializer: publicKey,
      worker: workerPk,
      admin1: admin1Pk,
      admin2: admin2Pk,
      usdcMint: new PublicKey(props.usdcMint),
      escrowStatePda,
      vaultPda,
      initializerUsdcAta,
      feeBps: 500,
    })

    // 2) Backend
    txStatus.value = "Creation du contrat..."
    const res = await api.post("/contracts", {
      title: form.title,
      description: form.description,
      checkpoints: checkpointsArray,
      timeline: {
        start: form.timeline.start,
        end: form.timeline.end,
      },
      amountUsdc,
      employerUuid,
      employerWallet,
      freelancerWallet,
      txSig: signature,
      escrowStatePda: escrowStatePda.toBase58(),
      vaultPda: vaultPda.toBase58(),
      usdcMint: props.usdcMint,
      programId: props.programId,
      feeWallet: props.feeWallet,
      chain: props.network || "solana-devnet",
    })

    txStatus.value = "Contrat cree."
    emit("created", res.data)
  } catch (err) {
    console.error("Create contract error:", err)
    alert(err.message || "Erreur creation contrat.")
  } finally {
    loading.value = false
  }
}

function close() {
  emit("close")
}

// --------------------------------------------------
// INIT UI
// --------------------------------------------------
onMounted(() => {
  startPicker = flatpickr(startInput.value, {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "M d, Y",
    minDate: "today",
    onChange: (d) => {
      form.timeline.start = normalizeIso(d[0])
      syncEndMinDate()
    },
  })

  endPicker = flatpickr(endInput.value, {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "M d, Y",
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
        <p class="muted">
          Set financial details and validation checkpoints to launch escrow.
        </p>
      </div>
      <button class="close" type="button" @click="close">x</button>
    </header>

    <div class="grid">
      <label class="field">
        <span>Title</span>
        <input v-model="form.title" placeholder="e.g., L2 Audit November" />
      </label>

      <label class="field ">
        <span>Assign to</span>
        <div class="select-shell">
          <select v-model="form.employer" @change="console.log('Selected employer:', form.employer)">
            <option disabled value="">Select a client</option>
            <option v-for="client in employers" :key="client.uuid" :value="client">
              {{ client.label }}
            </option>
          </select>
        </div>

      </label>

      <label class="field full">
        <span>Amount (USDC)</span>
        <input v-model="form.amountUsdc" type="number" min="0" step="0.01" placeholder="e.g., 2500" />
        <p class="muted">USDC Balance: {{ usdcBalance.toFixed(2) }} USDC</p>
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
/* ================================================
   🔥 FIX SELECT CUSTOM (ne change rien d’autre)
   ================================================ */
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



/* ================================================
   🟣 TON STYLE ORIGINAL COMPLET (RESTAURÉ)
   ================================================ */

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
.date-input {
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
