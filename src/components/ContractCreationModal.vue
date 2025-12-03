<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue"
import flatpickr from "flatpickr"
import "flatpickr/dist/themes/dark.css"
import { ethers } from "ethers"
import api from "../services/api"

function getMetaMask() {
  const eth = window.ethereum
  if (!eth) return null
  if (eth.providers?.length) {
    const mm = eth.providers.find((p) => p.isMetaMask && !p.isCoinbaseWallet)
    if (mm) return mm
  }
  return eth.isMetaMask && !eth.isCoinbaseWallet ? eth : null
}

async function connectEvmWallet() {
  const eth = getMetaMask()
  if (!eth) throw new Error("Aucun wallet Metamask détecté.")
  const accounts = await eth.request({ method: "eth_requestAccounts" })
  const provider = new ethers.BrowserProvider(eth)
  return {
    provider,
    account: accounts?.[0],
    signer: await provider.getSigner(),
  }
}

const props = defineProps({
  employers: Array, // [{ uuid, label, walletAddress }]
  freelancerWallet: String,
  escrowAddress: String,
  usdcAddress: String,
  chainId: String,
  chain: String,
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

const usdcAddressMissing = computed(() => !props.usdcAddress)
const escrowAddressMissing = computed(() => !props.escrowAddress)

const ABI_USDC = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
]

const ABI_ESCROW = [
  "event EscrowCreated(uint256 indexed escrowId,address employer,address freelancer,uint256 amount)",
  "function createEscrow(address freelancer,uint256 amount) external",
]

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
    !usdcAddressMissing.value &&
    !escrowAddressMissing.value
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

async function loadUsdcBalance() {
  try {
    if (usdcAddressMissing.value) {
      txStatus.value = "Adresse USDC manquante."
      return
    }

    txStatus.value = "Chargement du solde USDC..."
    const { provider, account } = await connectEvmWallet()
    if (!account) {
      txStatus.value = "Connexion wallet requise."
      return
    }

    if (props.chainId) {
      const net = await provider.getNetwork()
      const currentChainId = net.chainId ? "0x" + net.chainId.toString(16) : ""
      if (currentChainId && props.chainId.toLowerCase() !== currentChainId.toLowerCase()) {
        txStatus.value = `Mauvais réseau (${currentChainId}). Sélectionne ${props.chainId}.`
        return
      }
    }

    const usdc = new ethers.Contract(props.usdcAddress, ABI_USDC, provider)
    const bal = await usdc.balanceOf(account)
    usdcBalance.value = Number(ethers.formatUnits(bal, 6))
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
    txStatus.value = "Connecting wallet..."

    const { provider, signer, account: employerWallet } = await connectEvmWallet()

    if (!employerWallet) {
      alert("Connexion wallet requise.")
      return
    }

    if (
      form.employer.walletAddress.toLowerCase() !==
      employerWallet.toLowerCase()
    ) {
      alert("Le wallet connecté ne correspond pas à l'employeur sélectionné.")
      return
    }

    if (props.chainId) {
      const net = await provider.getNetwork()
      const currentChainId = net.chainId ? "0x" + net.chainId.toString(16) : ""
      if (currentChainId && props.chainId.toLowerCase() !== currentChainId.toLowerCase()) {
        alert("Mauvais réseau sélectionné dans le wallet.")
        return
      }
    }

    if (usdcAddressMissing.value || escrowAddressMissing.value) {
      alert("Adresse USDC ou Escrow manquante.")
      return
    }

    const amount = ethers.parseUnits(form.price.toString(), 6)

    txStatus.value = "Approval USDC..."
    const usdc = new ethers.Contract(props.usdcAddress, ABI_USDC, signer)
    const approveTx = await usdc.approve(props.escrowAddress, amount)
    await approveTx.wait()

    txStatus.value = "Création du contrat d'escrow..."
    const escrow = new ethers.Contract(props.escrowAddress, ABI_ESCROW, signer)
    const tx = await escrow.createEscrow(props.freelancerWallet, amount)
    const receipt = await tx.wait()

    let escrowIdOnChain = null
    for (const log of receipt.logs) {
      try {
        const parsed = escrow.interface.parseLog(log)
        if (parsed?.name === "EscrowCreated") {
          escrowIdOnChain = Number(parsed.args.escrowId)
        }
      } catch {}
    }

    const txHash = receipt.hash

    txStatus.value = "Enregistrement backend..."

    const res = await api.post("/api/contracts", {
      title: form.title,
      description: form.description,
      checkpoints: form.checkpoints
        ? form.checkpoints.split("\n").map((c) => c.trim()).filter(Boolean)
        : [],
      timeline: form.timeline,
      amountUsdc: form.price,
      employerUuid: form.employer.uuid,
      employerWallet,
      freelancerWallet: props.freelancerWallet,
      txHash,
      escrowIdOnChain,
      chain: props.chain || "ethereum-mainnet",
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
          <p v-if="usdcAddressMissing" class="warning">Adresse USDC manquante.</p>
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
            <button class="refresh" type="button" @click="loadUsdcBalance">↻</button>
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
  content: "▼";
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
