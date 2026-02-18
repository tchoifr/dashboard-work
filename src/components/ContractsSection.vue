<script setup>
import { jsPDF } from 'jspdf'
import byhnexLogo from "../assets/byhnexLogo.png"

const props = defineProps({
  contracts: Array,
})

const emit = defineEmits(['create-contract', 'view-contract'])

const openContract = () => emit('create-contract')

const readRawTitle = (contract) =>
  contract.title ||
  contract.contractTitle ||
  contract.contract_title ||
  contract.name ||
  contract.jobTitle ||
  contract.job_title ||
  ""

const isGeneratedContractTitle = (value) =>
  /^contract\s+[0-9a-f-]{16,}$/i.test(String(value || "").trim())

const toNumber = (value) => {
  if (value == null) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const raw = String(value).trim()
  if (!raw) return null
  const normalized = raw.replace(/\s+/g, "").replace(/[^\d,.-]/g, "").replace(/,/g, ".")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const contractTitle = (contract) =>
  (() => {
    const title = String(readRawTitle(contract) || "").trim()
    if (!title || isGeneratedContractTitle(title)) return "Untitled contract"
    return title
  })()

const contractAmount = (contract) => {
  const value = toNumber(
    contract.amountUsdc ??
    contract.amount_usdc ??
    contract.amountTotalUsdc ??
    contract.amount_total_usdc ??
    contract.totalAmountUsdc ??
    contract.total_amount_usdc ??
    contract.usdcAmount ??
    contract.usdc_amount ??
    contract.amounts?.totalUsdc ??
    contract.amounts?.total_usdc ??
    contract.amounts?.amountUsdc ??
    contract.amounts?.amount_usdc ??
    contract.amount
  )
  if (value == null) return "-"
  return `${value.toFixed(2)} USDC`
}

const contractStart = (contract) =>
  contract.startAt ||
  contract.start_at ||
  contract.startDate ||
  contract.start_date ||
  contract.startsAt ||
  contract.starts_at ||
  contract.periodStart ||
  contract.period_start ||
  contract.period?.start ||
  contract.period?.startAt ||
  contract.createdAt ||
  contract.created_at ||
  contract.timeline?.start ||
  null

const contractEnd = (contract) =>
  contract.findPeriodAt ||
  contract.find_period_at ||
  contract.endAt ||
  contract.end_at ||
  contract.endDate ||
  contract.end_date ||
  contract.endsAt ||
  contract.ends_at ||
  contract.periodEnd ||
  contract.period_end ||
  contract.period?.end ||
  contract.period?.endAt ||
  contract.timeline?.end ||
  null

const formatDate = (value) => {
  if (!value) return null
  const raw = String(value).trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (match) return `${match[1]}-${match[2]}-${match[3]}`
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const contractPeriod = (contract) => {
  const start = formatDate(contractStart(contract))
  const end = formatDate(contractEnd(contract))
  if (!start && !end) return "-"
  return `${start || "?"} -> ${end || "?"}`
}

const formatHumanDate = (value) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

const shorten = (value, left = 6, right = 4) => {
  const raw = String(value || "").trim()
  if (!raw) return "-"
  if (raw.length <= left + right + 3) return raw
  return `${raw.slice(0, left)}...${raw.slice(-right)}`
}

const isUuidLike = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim(),
  )

const cleanName = (value) => {
  const v = String(value || "").trim()
  if (!v) return "-"
  if (isUuidLike(v)) return "-"
  return v
}

const resolveEmployerName = (contract) =>
  cleanName(
    contract?.employer?.username ||
      contract?.employer?.name ||
      contract?.employerName ||
      contract?.employer_name ||
      "",
  )

const resolveEmployerWallet = (contract) =>
  contract?.employer?.walletAddress ||
  contract?.employer?.wallet_address ||
  contract?.employerWallet ||
  contract?.employer_wallet ||
  contract?.initializerWallet ||
  contract?.initializer_wallet ||
  "-"

const resolveFreelancerName = (contract) =>
  cleanName(
    contract?.freelancer?.username ||
      contract?.freelancer?.name ||
      contract?.freelancerName ||
      contract?.freelancer_name ||
      "",
  )

const resolveFreelancerWallet = (contract) =>
  contract?.freelancer?.walletAddress ||
  contract?.freelancer?.wallet_address ||
  contract?.freelancerWallet ||
  contract?.freelancer_wallet ||
  contract?.workerWallet ||
  contract?.worker_wallet ||
  "-"

const resolveNetwork = (contract) => contract?.chain || "Solana"

const resolveEscrow = (contract) =>
  contract?.escrowStatePda ||
  contract?.escrow_state_pda ||
  contract?.onchain?.escrowStatePda ||
  contract?.onchain?.escrow_state_pda ||
  "-"

const resolveTxHash = (contract) =>
  contract?.txFundSig ||
  contract?.tx_fund_sig ||
  contract?.txReleaseSig ||
  contract?.tx_release_sig ||
  contract?.txResolveSig ||
  contract?.tx_resolve_sig ||
  null

const resolveProgramId = (contract) =>
  contract?.programId ||
  contract?.program_id ||
  contract?.onchain?.programId ||
  contract?.onchain?.program_id ||
  null

const hasValue = (value) => {
  const v = String(value || "").trim()
  return !!v && v !== "-"
}

const resolveExplorerCluster = (contract) => {
  const chain = String(contract?.chain || "").toLowerCase()
  if (chain.includes("mainnet")) return ""
  if (chain.includes("testnet")) return "testnet"
  return "devnet"
}

const buildExplorerUrl = (kind, value, contract) => {
  if (!hasValue(value)) return null
  const cluster = resolveExplorerCluster(contract)
  const encoded = encodeURIComponent(String(value).trim())
  const base = kind === "tx"
    ? `https://explorer.solana.com/tx/${encoded}`
    : `https://explorer.solana.com/address/${encoded}`
  return cluster ? `${base}?cluster=${cluster}` : base
}

const resolveCheckpoints = (contract) => {
  const raw =
    contract?.checkpoints ||
    contract?.validationCheckpoints ||
    contract?.validation_checkpoints ||
    null

  if (Array.isArray(raw)) return raw.map((v) => String(v || "").trim()).filter(Boolean)
  if (typeof raw === "string") {
    return raw
      .split(/\n|;/)
      .map((v) => v.trim())
      .filter(Boolean)
  }
  return []
}

const buildContractRef = (contract) => {
  const baseDate = contractStart(contract) || contract?.createdAt || contract?.created_at || new Date().toISOString()
  const date = new Date(baseDate)
  const yyyy = Number.isNaN(date.getTime()) ? "0000" : String(date.getFullYear())
  const mm = Number.isNaN(date.getTime()) ? "00" : String(date.getMonth() + 1).padStart(2, "0")
  const dd = Number.isNaN(date.getTime()) ? "00" : String(date.getDate()).padStart(2, "0")
  const seq = String(contract?.id || contract?.contractIdU64 || "1").replace(/[^\d]/g, "").slice(-3).padStart(3, "0")
  return `BNX-${yyyy}-${mm}${dd}-${seq}`
}

let logoPromise = null
const getLogoImage = () => {
  if (logoPromise) return logoPromise
  logoPromise = new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = byhnexLogo
  })
  return logoPromise
}

const addSectionTitle = (doc, text, y) => {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(40, 85, 170)
  doc.text(text, 16, y)
}

const addLine = (doc, label, value, y) => {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(25, 25, 25)
  doc.text(`${label}:`, 16, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const lines = doc.splitTextToSize(String(value || "-"), 145)
  doc.text(lines, 58, y)
  return y + Math.max(7, lines.length * 5 + 2)
}

const downloadContract = async (contract) => {
  const doc = new jsPDF()

  // Header
  try {
    const logoImg = await getLogoImage()
    doc.addImage(logoImg, "PNG", 14, 10, 18, 18)
  } catch {
    // Logo is optional for PDF generation; continue without it.
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(26, 40, 84)
  doc.text(contractTitle(contract), 105, 19, { align: "center" })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(36, 110, 205)
  doc.text("BYHNEX CONTRACT SUMMARY", 16, 36)

  doc.setDrawColor(70, 110, 190)
  doc.line(16, 39, 194, 39)

  let y = 47
  y = addLine(doc, "Contract ID", `#${buildContractRef(contract)}`, y)
  y = addLine(doc, "Generated", formatHumanDate(new Date().toISOString()), y)

  y += 4
  addSectionTitle(doc, "Parties", y)
  y += 7
  y = addLine(doc, "Employer name", resolveEmployerName(contract), y)
  y = addLine(doc, "Employer wallet", resolveEmployerWallet(contract), y)
  y = addLine(doc, "Freelancer name", resolveFreelancerName(contract), y)
  y = addLine(doc, "Freelancer wallet", resolveFreelancerWallet(contract), y)

  y += 4
  addSectionTitle(doc, "Payment", y)
  y += 7
  y = addLine(doc, "Amount", contractAmount(contract), y)
  y = addLine(doc, "Network", resolveNetwork(contract), y)
  y = addLine(doc, "Escrow", shorten(resolveEscrow(contract), 10, 6), y)

  y += 4
  addSectionTitle(doc, "Period", y)
  y += 7
  y = addLine(doc, "From", formatHumanDate(contractStart(contract)), y)
  y = addLine(doc, "To", formatHumanDate(contractEnd(contract)), y)

  y += 4
  addSectionTitle(doc, "Blockchain Info", y)
  y += 7
  const txHash = resolveTxHash(contract)
  const txExplorer = buildExplorerUrl("tx", txHash, contract)
  const programId = resolveProgramId(contract)
  const programExplorer = buildExplorerUrl("address", programId, contract)

  if (hasValue(txHash)) {
    y = addLine(doc, "Transaction Hash", shorten(txHash, 10, 6), y)
    if (txExplorer) y = addLine(doc, "Tx Explorer", txExplorer, y)
  }

  if (hasValue(programId)) {
    y = addLine(doc, "Program ID", programId, y)
    if (programExplorer) y = addLine(doc, "Program Explorer", programExplorer, y)
  }

  const checkpoints = resolveCheckpoints(contract)
  if (checkpoints.length) {
    y += 4
    addSectionTitle(doc, "Validation Checklist", y)
    y += 7
    for (let i = 0; i < checkpoints.length; i += 1) {
      y = addLine(doc, `Checkpoint ${i + 1}`, checkpoints[i], y)
    }
  }

  if (contract?.description) {
    y += 4
    addSectionTitle(doc, "Description", y)
    y += 7
    y = addLine(doc, "Scope", contract.description, y)
  }

  doc.save(`${contractTitle(contract)}.pdf`)
}

const viewContract = (contract) => emit('view-contract', contract)
</script>

<template>
  <section class="contracts">
    <div class="panel-header">
      <h2>My Contracts</h2>
      <button class="primary-btn" type="button" @click="openContract">
        <span class="plus">+</span>
        New Contract
      </button>
    </div>

    <div class="grid">
      <article
        v-for="contract in contracts"
        :key="contract.uuid || contract.id || contract.name"
        class="card"
      >
        <div class="card-top">
          <div class="icon">
            <span class="doc">📄</span>
          </div>
          <div class="info">
            <h3>{{ contractTitle(contract) }}</h3>
          </div>
        </div>

        <div class="meta">
          <div>
            <p class="label">Amount</p>
            <p class="value">{{ contractAmount(contract) }}</p>
          </div>
          <div>
            <p class="label">Period</p>
            <p class="value">{{ contractPeriod(contract) }}</p>
          </div>
        </div>

        <div class="cta-row">
          <button class="outline-btn" type="button" @click="viewContract(contract)">View</button>
          <button class="icon-btn" type="button" title="Download" @click="downloadContract(contract)">
            ⬇
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.contracts {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

h2 {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-size: 17px;
  font-weight: 800;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
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

.plus {
  font-size: 16px;
  line-height: 1;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(385px, 1fr));
  gap: 16px;
}

.card {
  background: linear-gradient(160deg, rgba(8, 12, 24, 0.92), rgba(10, 17, 32, 0.9));
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 14px;
  padding: 16px;
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.32),
    0 0 18px rgba(120, 90, 255, 0.2);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card-top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
}

.icon {
  height: 40px;
  width: 40px;
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(106, 72, 255, 0.2), rgba(0, 198, 255, 0.16));
  display: grid;
  place-items: center;
  border: 1px solid rgba(120, 90, 255, 0.4);
}

.doc {
  font-size: 20px;
}

.info h3 {
  color: #eae7ff;
  font-size: 15px;
  font-weight: 700;
}

.muted {
  color: #8f9cb8;
  font-size: 13px;
}

.badge {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
  justify-self: end;
}

.badge.active {
  color: #6ecbff;
  background: rgba(110, 203, 255, 0.14);
  border: 1px solid rgba(110, 203, 255, 0.5);
}

.badge.signed {
  color: #7bd38f;
  background: rgba(123, 211, 143, 0.18);
  border: 1px solid rgba(123, 211, 143, 0.45);
}

.badge.pending {
  color: #f3c26b;
  background: rgba(243, 194, 107, 0.16);
  border: 1px solid rgba(243, 194, 107, 0.45);
}

.meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.label {
  color: #6d7c92;
  font-size: 12px;
}

.value {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-weight: 800;
  display: inline-block;
}

.cta-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
}

.outline-btn {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(120, 90, 255, 0.4);
  background: rgba(120, 90, 255, 0.12);
  color: #e2dbff;
  font-weight: 700;
  cursor: pointer;
}

.icon-btn {
  height: 36px;
  width: 36px;
  border-radius: 10px;
  border: 1px solid rgba(120, 90, 255, 0.35);
  background: rgba(120, 90, 255, 0.12);
  color: #d6c7ff;
  cursor: pointer;
  font-size: 16px;
}

@media (max-width: 640px) {
  .cta-row {
    grid-template-columns: 1fr 1fr;
  }
  .grid{
        grid-template-columns: repeat(auto-fit, minmax(282px, 1fr));
  }
}
</style>
