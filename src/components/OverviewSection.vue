<script setup>
import { computed } from "vue"

const props = defineProps({
  contracts: {
    type: Array,
    default: () => [],
  },
  conversations: {
    type: Array,
    default: () => [],
  },
  wallet: {
    type: Object,
    default: () => ({}),
  },
  applicantsCount: {
    type: Number,
    default: 0,
  },
  unreadMessages: {
    type: Number,
    default: 0,
  },
})
const emit = defineEmits(["view-all-wallet", "view-all-transactions", "view-contract"])

const numberOrNull = (value) => {
  if (value == null) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null

  const raw = String(value).trim()
  if (!raw) return null

  // Accept values like: "1,200.50", "1 200,50 USDC", "$1200.50"
  let normalized = raw.replace(/\s+/g, "").replace(/[^\d,.-]/g, "")

  if (!normalized) return null

  const hasComma = normalized.includes(",")
  const hasDot = normalized.includes(".")

  if (hasComma && hasDot) {
    normalized = normalized.replace(/,/g, "")
  } else if (hasComma && !hasDot) {
    normalized = normalized.replace(/,/g, ".")
  }

  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

const normalizeStatus = (status) =>
  String(status || "draft")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^\w]/g, "")

const parseContractAmount = (contract) =>
  numberOrNull(
    contract?.amountUsdc ??
      contract?.amount_usdc ??
      contract?.amountTotalUsdc ??
      contract?.amount_total_usdc ??
      contract?.amounts?.totalUsdc ??
      contract?.amounts?.total_usdc ??
      contract?.onchain?.amountUsdc ??
      contract?.onchain?.amount_usdc ??
      contract?.amount,
  )

const parseContractDate = (contract) => {
  const raw =
    contract?.updatedAt ||
    contract?.updated_at ||
    contract?.createdAt ||
    contract?.created_at ||
    contract?.startAt ||
    contract?.start_at ||
    null

  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

const formatRelativeTime = (dateInput) => {
  if (!dateInput) return "Unknown"
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(date.getTime())) return "Unknown"

  const diffMs = Date.now() - date.getTime()
  if (diffMs < 60 * 1000) return "just now"
  if (diffMs < 60 * 60 * 1000) return `${Math.floor(diffMs / (60 * 1000))} min ago`
  if (diffMs < 24 * 60 * 60 * 1000) return `${Math.floor(diffMs / (60 * 60 * 1000))} hours ago`
  return `${Math.floor(diffMs / (24 * 60 * 60 * 1000))} days ago`
}

const formatUsdc = (value) => {
  const n = numberOrNull(value)
  if (n === null) return "0.00 USDC"
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`
}

const contractTitle = (contract) =>
  contract?.title ||
  contract?.name ||
  contract?.jobTitle ||
  contract?.job_title ||
  `Contract ${contract?.uuid || contract?.id || ""}`.trim()

const contractSubtitle = (contract) =>
  contract?.freelancer?.username ||
  contract?.freelancer?.walletAddress ||
  contract?.freelancer?.wallet_address ||
  contract?.employer?.username ||
  contract?.employer?.walletAddress ||
  contract?.employer?.wallet_address ||
  "Smart contract"

const statusLabel = (status) => normalizeStatus(status).replace(/_/g, " ")

const statusProgress = (status) => {
  const s = normalizeStatus(status)
  if (["released", "completed", "paid", "accepted"].includes(s)) return 100
  if (["funded", "active", "funded_active", "in_progress", "ongoing"].includes(s)) return 72
  if (["signed", "approved"].includes(s)) return 58
  if (["pending", "pending_signature", "waiting_payment"].includes(s)) return 42
  if (["draft", "created"].includes(s)) return 28
  if (["disputed", "cancelled", "rejected"].includes(s)) return 18
  return 36
}

const walletItems = computed(() => {
  const fromContracts = [...props.contracts].map((contract) => ({
    id: contract.uuid || contract.id || contractTitle(contract),
    isContract: true,
    contract,
    title: contractTitle(contract),
    subtitle: contractSubtitle(contract),
    progress: statusProgress(contract.status),
    leftMeta: statusLabel(contract.status),
    middleMeta: formatRelativeTime(parseContractDate(contract)),
    rightMain: formatUsdc(parseContractAmount(contract)),
    rightSub: parseContractAmount(contract) === null ? "No amount" : "Contract value",
  }))

  return fromContracts
})

const txFromContracts = computed(() => {
  return [...props.contracts]
    .sort((a, b) => {
      const aTime = parseContractDate(a)?.getTime() || 0
      const bTime = parseContractDate(b)?.getTime() || 0
      return bTime - aTime
    })
    .map((contract) => {
      const status = normalizeStatus(contract?.status)
      const amount = parseContractAmount(contract)
      let amountClass = "neutral"
      let icon = "circle"
      if (["released", "completed", "paid", "accepted"].includes(status)) {
        amountClass = "positive"
        icon = "down"
      } else if (["disputed", "cancelled", "rejected", "failed"].includes(status)) {
        amountClass = "negative"
        icon = "up"
      }

      return {
        id: `contract-${contract.uuid || contract.id || contractTitle(contract)}`,
        title: `${statusLabel(contract.status)} - ${contractTitle(contract)}`,
        time: formatRelativeTime(parseContractDate(contract)),
        amount:
          amount === null
            ? "--"
            : `${amountClass === "positive" ? "+" : amountClass === "negative" ? "-" : ""}${formatUsdc(Math.abs(amount))}`,
        amountClass,
        icon,
      }
    })
})

const txFromMessages = computed(() => {
  return [...props.conversations].map((c) => ({
      id: `message-${c.id || c.name || "last"}`,
      title: `New message${c?.name ? ` from ${c.name}` : ""}`,
      time: c?.time || "recent",
      amount: "chat",
      amountClass: "neutral",
      icon: "circle",
    }))
})

const transactions = computed(() => {
  const merged = [...txFromContracts.value, ...txFromMessages.value]
  return merged
})

const totalEarningsValue = computed(() =>
  props.contracts.reduce((sum, contract) => sum + (parseContractAmount(contract) || 0), 0),
)

const earningsDeltaValue = computed(() => {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()

  return props.contracts.reduce((sum, contract) => {
    const date = parseContractDate(contract)
    if (!date) return sum
    if (date.getMonth() !== month || date.getFullYear() !== year) return sum
    return sum + (parseContractAmount(contract) || 0)
  }, 0)
})

const activeContractsCount = computed(() => {
  const activeStatuses = new Set([
    "active",
    "signed",
    "funded",
    "funded_active",
    "in_progress",
    "ongoing",
  ])
  return props.contracts.filter((contract) =>
    activeStatuses.has(normalizeStatus(contract?.status)),
  ).length
})

const pendingInvoicesCount = computed(() => {
  const pendingStatuses = new Set([
    "pending",
    "draft",
    "created",
    "waiting_payment",
    "pending_signature",
    "pending_payment",
  ])
  return props.contracts.filter((contract) =>
    pendingStatuses.has(normalizeStatus(contract?.status)),
  ).length
})

const totalEarnings = computed(() => formatUsdc(totalEarningsValue.value))
const earningsDelta = computed(() => formatUsdc(earningsDeltaValue.value))
const activeContracts = computed(() => activeContractsCount.value)
const pendingInvoices = computed(() => pendingInvoicesCount.value)
</script>

<template>
  <section class="overview-grid">
    <div class="stack-left">
      <article class="panel panel-large">
        <header class="panel-header">
          <h2>Wallet Info</h2>
        </header>

        <div class="wallet-banner">
          <div class="wallet-badge">w</div>
          <div>
            <p class="wallet-banner-title">Wallet phantom</p>
            <p class="wallet-banner-sub">Dynamic data</p>
          </div>
        </div>

        <div class="wallet-list">
          <article
            v-for="item in walletItems"
            :key="item.id"
            :class="['wallet-row', { clickable: item.isContract }]"
            :role="item.isContract ? 'button' : undefined"
            :tabindex="item.isContract ? 0 : undefined"
            @click="item.isContract && emit('view-contract', item.contract)"
            @keydown.enter="item.isContract && emit('view-contract', item.contract)"
          >
            <div class="wallet-main">
              <h3>{{ item.title }}</h3>
              <p>{{ item.subtitle }}</p>
            </div>

            <div class="wallet-meta">
              <span>{{ item.leftMeta }}</span>
              <span>{{ item.middleMeta }}</span>
            </div>

            <div class="wallet-value">
              <strong>{{ item.rightMain }}</strong>
              <span>{{ item.rightSub }}</span>
            </div>

            <div class="progress-track">
              <span class="progress-fill" :style="{ width: `${item.progress}%` }" />
            </div>
          </article>
        </div>
        <button class="view-all" @click="emit('view-all-wallet')">View All</button>
      </article>

      <article class="panel panel-stats">
        <header class="panel-header">
          <h2>Stats</h2>
        </header>

        <div class="stats-row">
          <div class="stat-item">
            <p class="stat-value">{{ totalEarnings }}</p>
            <p class="stat-sub up">{{ earningsDelta }} this month</p>
          </div>
          <div class="stat-item">
            <p class="stat-value">{{ activeContracts }}</p>
            <p class="stat-sub">Active Contracts</p>
          </div>
          <div class="stat-item">
            <p class="stat-value">{{ pendingInvoices }}</p>
            <p class="stat-sub">Pending Invoices</p>
          </div>
        </div>
      </article>
    </div>

    <div class="stack-right">
      <article class="panel">
        <header class="panel-header">
          <h2>Recent Transactions</h2>
        </header>

        <div class="transaction-list">
          <article v-for="tx in transactions" :key="tx.id" class="tx-row">
            <span class="tx-icon" :class="`icon-${tx.icon}`" />
            <div class="tx-main">
              <p class="tx-title">{{ tx.title }}</p>
              <p class="tx-time">{{ tx.time }}</p>
            </div>
            <div class="tx-meta">
              <p class="tx-amount" :class="tx.amountClass">{{ tx.amount }}</p>
              <p class="tx-time">{{ tx.time }}</p>
            </div>
          </article>

          <p v-if="!transactions.length" class="empty-tx">No activity yet.</p>
        </div>

        <button class="view-all" @click="emit('view-all-transactions')">View All</button>
      </article>

      <article class="panel panel-stats compact">
        <header class="panel-header">
          <h2>Inbox & Hiring</h2>
        </header>

        <div class="stats-row compact-row">
          <div class="stat-item">
            <p class="stat-label">Applicants</p>
            <p class="stat-value">{{ props.applicantsCount }}</p>
            <p class="stat-sub">On my job posts</p>
          </div>
          <div class="stat-item">
            <p class="stat-label">Unread</p>
            <p class="stat-value">{{ props.unreadMessages }}</p>
            <p class="stat-sub">Messages not read</p>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: 16px;
}

.stack-left,
.stack-right {
  display: grid;
  gap: 16px;
}

.panel {
  border-radius: 14px;
  border: 1px solid rgba(72, 104, 255, 0.55);
  background:
    radial-gradient(circle at 15% -10%, rgba(64, 119, 255, 0.22), transparent 42%),
    linear-gradient(165deg, rgba(8, 11, 37, 0.95), rgba(6, 10, 29, 0.95));
  padding: 14px;
  box-shadow:
    0 14px 26px rgba(0, 0, 0, 0.34),
    inset 0 0 0 1px rgba(133, 163, 255, 0.12),
    0 0 16px rgba(43, 85, 255, 0.2);
}

.panel-large {
  min-height: 380px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
  color: #f3f7ff;
  letter-spacing: 0.03em;
}

.dots {
  color: #7591d7;
  font-weight: 700;
  letter-spacing: 0.3em;
}

.wallet-list {
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
  max-height: 390px;
  overflow-y: auto;
  padding-right: 6px;
}

.wallet-list::-webkit-scrollbar,
.transaction-list::-webkit-scrollbar {
  width: 6px;
}

.wallet-list::-webkit-scrollbar-thumb,
.transaction-list::-webkit-scrollbar-thumb {
  background-image: linear-gradient(180deg, #6b1dff 0%, #2d82ff 100%);
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 0 10px rgba(45, 130, 255, 0.45),
    inset 0 0 6px rgba(255, 255, 255, 0.18);
}

.wallet-list::-webkit-scrollbar-track,
.transaction-list::-webkit-scrollbar-track {
  background: rgba(3, 5, 15, 0.85);
  border-radius: 999px;
}

.wallet-banner {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(102, 127, 218, 0.35);
  background: rgba(12, 18, 46, 0.75);
}

.wallet-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(145deg, #6f64ff, #4eb3ff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #eaf1ff;
  font-size: 12px;
  font-weight: 700;
}

.wallet-banner-title {
  margin: 0;
  color: #dce7ff;
  font-size: 13px;
}

.wallet-banner-sub {
  margin: 2px 0 0;
  color: #7f96c7;
  font-size: 11px;
}

.wallet-row {
  border: 1px solid rgba(103, 127, 221, 0.35);
  border-radius: 12px;
  padding: 12px;
  background: rgba(9, 14, 42, 0.7);
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) auto auto;
  gap: 12px;
  align-items: center;
  margin-top: 10px;
}

.wallet-row.clickable {
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.wallet-row.clickable:hover {
  border-color: rgba(120, 151, 243, 0.7);
  box-shadow: 0 0 0 1px rgba(120, 151, 243, 0.25);
  transform: translateY(-1px);
}

.wallet-main h3 {
  margin: 0;
  color: #dce7ff;
  font-size: 17px;
  font-weight: 600;
}

.wallet-main p {
  margin: 3px 0 0;
  color: #7892c7;
  font-size: 12px;
  word-break: break-all;
}

.wallet-meta {
  display: grid;
  gap: 4px;
  text-align: right;
}

.wallet-meta span {
  color: #86a2da;
  font-size: 12px;
}

.wallet-value {
  text-align: right;
  display: grid;
  gap: 4px;
}

.wallet-value strong {
  color: #ecf4ff;
  font-size: 24px;
  font-weight: 600;
}

.wallet-value span {
  color: #8ea8d9;
  font-size: 12px;
}

.progress-track {
  grid-column: 1 / -1;
  width: 100%;
  height: 5px;
  background: rgba(143, 175, 255, 0.18);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #5ba8ff, #8f6dff);
}

.transaction-list {
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
  max-height: 330px;
  overflow-y: auto;
  padding-right: 6px;
}

.tx-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(101, 131, 226, 0.2);
  padding-bottom: 10px;
}

.tx-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.tx-icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: rgba(72, 107, 255, 0.2);
  border: 1px solid rgba(105, 140, 250, 0.35);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #9ec7ff;
  font-weight: 700;
}

.icon-down::before {
  content: "v";
}

.icon-up::before {
  content: "^";
}

.icon-circle::before {
  content: "o";
}

.tx-title {
  margin: 0;
  color: #dce7ff;
  font-size: 13px;
}

.tx-time {
  margin: 2px 0 0;
  color: #7f96c7;
  font-size: 11px;
}

.tx-meta {
  text-align: right;
}

.tx-amount {
  margin: 0;
  font-weight: 700;
}

.tx-amount.positive {
  color: #64efb8;
}

.tx-amount.negative {
  color: #bd98ff;
}

.tx-amount.neutral {
  color: #93b1e5;
}

.empty-tx {
  margin: 4px 0 0;
  color: #88a1d3;
  font-size: 12px;
}

.view-all {
  height: 34px;
  width: 104px;
  border-radius: 999px;
  border: 1px solid rgba(99, 128, 255, 0.5);
  background: rgba(15, 28, 66, 0.8);
  color: #d5e3ff;
  font-weight: 600;
  font-size: 12px;
  display: block;
  margin: 14px auto 0;
  cursor: pointer;
}

.panel-stats {
  min-height: 138px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.stat-item {
  padding-left: 8px;
  border-left: 1px solid rgba(116, 145, 230, 0.2);
}

.stat-item:first-child {
  border-left: 0;
  padding-left: 0;
}

.stat-label {
  margin: 0 0 4px;
  color: #8ca6d9;
  font-size: 12px;
}

.stat-value {
  margin: 0;
  color: #f4f8ff;
  font-size: 35px;
  font-weight: 500;
}

.stat-sub {
  margin: 4px 0 0;
  color: #89a1d1;
  font-size: 12px;
}

.stat-sub.up {
  color: #71f0bd;
}

.panel-stats.compact .stat-value {
  font-size: 27px;
}

.panel-stats.compact .compact-row {
  grid-template-columns: 1fr 1fr;
}

@media (max-width: 1100px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }

  .panel-large {
    min-height: auto;
  }
}

@media (max-width: 760px) {
  .wallet-row {
    grid-template-columns: 1fr;
  }

  .wallet-meta,
  .wallet-value,
  .tx-meta {
    text-align: left;
  }

  .tx-row {
    grid-template-columns: 1fr;
  }

  .stats-row,
  .panel-stats.compact .compact-row {
    grid-template-columns: 1fr;
  }

  .stat-item {
    border-left: 0;
    border-top: 1px solid rgba(116, 145, 230, 0.2);
    padding-left: 0;
    padding-top: 8px;
  }

  .stat-item:first-child {
    border-top: 0;
    padding-top: 0;
  }
}
</style>
