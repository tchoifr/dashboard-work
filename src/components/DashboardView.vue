<script setup>
import { ref, computed, onMounted } from "vue"
import { useAuthStore } from "../store/auth"
import api from "../services/api"
import { DEFAULT_CHAIN } from "../services/solana"

// SECTIONS
import OverviewSection from "./OverviewSection.vue"
import ContractsSection from "./ContractsSection.vue"
import JobsSection from "./JobsSection.vue"
import RechargerJobsSection from "./RechargerJobsSection.vue"
import MessagesSection from "./MessagesSection.vue"
import ProfileSection from "./ProfileSection.vue"
import DaoDisputesSection from "./DaoDisputesSection.vue"
import AdminSection from "./AdminSection.vue"
import ContractCreationModal from "./ContractCreationModal.vue"
import ContractPreviewModal from "./ContractPreviewModal.vue"

// ==========================
// STORE AUTH
// ==========================
const auth = useAuthStore()

// ==========================
// TABS
// ==========================
const tabs = [
  "Overview",
  "Contracts",
  "My Jobs",
  "Find a job",
  "Messages",
  "Profile",
  "DAO",
  "Admin",
]

const activeTab = ref("Overview")

// ==========================
// PROFIL (vient du wallet)
// ==========================
const profile = computed(() => ({
  username: auth.user?.username || "User",
  wallet: auth.user?.walletAddress,
  chain: auth.user?.chain || DEFAULT_CHAIN,
}))

// ==========================
// CONTRATS (EMPTY - backend va remplir)
// ==========================
const activeContracts = ref([])

// ==========================
// JOBS (EMPTY - backend)
// ==========================
const jobs = ref([])

// ==========================
// MESSAGES (EMPTY - backend)
// ==========================
const conversations = ref([])
const threads = ref({})
const activeConversation = ref(null)

// ==========================
// DAO DISPUTES (EMPTY - backend)
// ==========================
const daoDisputes = ref([])

// ==========================
// ADMIN PANELS
// ==========================
const adminStats = ref([])
const adminTransactions = ref([])

const employers = ref([])
const freelancerWallet = computed(() => auth.user?.walletAddress || "")

const walletConfig = ref({
  usdcMint: "",
  programId: "",
  rpcUrl: import.meta.env.VITE_SOLANA_RPC || "https://api.devnet.solana.com",
  network: DEFAULT_CHAIN,
  admin1: "",
  admin2: "",
})

const programId = computed(() => walletConfig.value.programId || "")
const usdcMint = computed(() => walletConfig.value.usdcMint || "")

// ==========================
// ACTIONS
// ==========================
const setTab = (tab) => {
  activeTab.value = tab
}

// SAVE PROFILE
const handleProfileSave = (updated) => {
  // update backend
  console.log("Profile save:", updated)
}

// ==========================
// MESSAGES
// ==========================
const selectConversation = (c) => {
  activeConversation.value = c
  if (!threads.value[c.name]) {
    threads.value[c.name] = []
  }
}

const handleSendMessage = (text) => {
  if (!activeConversation.value || !text.trim()) return

  const convo = activeConversation.value.name
  const msg = {
    id: Date.now(),
    from: "me",
    author: auth.user.username,
    text,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }

  threads.value[convo].push(msg)
}

// ==========================
// JOBS (APPLY)
// ==========================
const showApplyModal = ref(false)
const selectedJob = ref(null)
const applyMessage = ref("")

const startApply = (job) => {
  selectedJob.value = job
  applyMessage.value = ""
  showApplyModal.value = true
}

const closeApplyModal = () => {
  showApplyModal.value = false
  selectedJob.value = null
  applyMessage.value = ""
}

const handleJobApplication = () => {
  console.log("Job application:", {
    job: selectedJob.value,
    message: applyMessage.value,
    wallet: auth.user.walletAddress,
  })
  closeApplyModal()
}

// ==========================
// CONTRACTS MODALS
// ==========================
const showContractModal = ref(false)
const showContractViewer = ref(false)
const activeContractPreview = ref(null)

const openContractModal = () => {
  if (!walletConfig.value.usdcMint || !walletConfig.value.programId) {
    alert("Config Solana manquante (usdcMint/programId via /api/wallet/config).")
    return
  }
  showContractModal.value = true
}

const closeContractModal = () => {
  showContractModal.value = false
}

const openContractViewer = (contract) => {
  activeContractPreview.value = contract
  showContractViewer.value = true
}

const closeContractViewer = () => {
  showContractViewer.value = false
  activeContractPreview.value = null
}

// SUBMIT NEW CONTRACT
const handleContractSubmit = (payload) => {
  console.log("Create contract:", payload)
  activeContracts.value.push(payload)
  closeContractModal()
}

async function loadMyContracts() {
  try {
    let data = null
    if (auth.user?.walletAddress) {
      const res = await api.get(`/escrows/user/${auth.user.walletAddress}`).catch(() => null)
      data = res?.data
    }
    if (!data) {
      const fallback = await api.get("/api/contracts/me").catch(() => null)
      data = fallback?.data
    }
    activeContracts.value = data || []
  } catch (e) {
    console.error("Load contracts failed", e)
  }
}

async function loadEmployers() {
  try {
    const { data } = await api.get("/users")
    const mapped = (data || []).map((u) => ({
      uuid: u.uuid,
      label: u.username || u.walletAddress,
      walletAddress: u.walletAddress,
    }))
    if (auth.user && !mapped.some((u) => u.uuid === auth.user.uuid)) {
      mapped.unshift({
        uuid: auth.user.uuid,
        label: auth.user.username || "Client",
        walletAddress: auth.user.walletAddress,
      })
    }
    employers.value = mapped
  } catch (e) {
    console.error("Load employers failed", e)
    if (auth.user) {
      employers.value = [{
        uuid: auth.user.uuid,
        label: auth.user.username || "Client",
        walletAddress: auth.user.walletAddress,
      }]
    }
  }
}

async function loadWalletConfig() {
  try {
    const { data } = await api.get("/api/wallet/config")
    const cfg = data || {}
    walletConfig.value = {
      usdcMint: cfg.usdcMint || cfg.usdc_address || cfg.usdcAddress || "",
      programId: cfg.programId || cfg.escrow_program_id || cfg.escrowAddress || "",
      rpcUrl: cfg.rpcUrl || cfg.rpc || walletConfig.value.rpcUrl,
      network: cfg.network || cfg.chain || cfg.chain_slug || DEFAULT_CHAIN,
      admin1: cfg.admin1 || cfg.admin_one || "",
      admin2: cfg.admin2 || cfg.admin_two || "",
    }
    console.log("Wallet config loaded:", walletConfig.value)
  } catch (e) {
    console.error("Load wallet config failed", e)
  }
}

onMounted(() => {
  loadWalletConfig()
  if (auth.isLogged) {
    loadMyContracts()
    loadEmployers()
  }
})
</script>

<template>
  <div class="page">

    <!-- =======================
         HEADER
    ======================== -->
    <header class="top-bar">
      <div class="work-pill">WORK</div>

      <div class="profile">
        {{ profile.username }}
      </div>
    </header>

    <!-- =======================
         NAVIGATION
    ======================== -->
    <nav class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="['tab', { active: activeTab === tab }]"
        @click="setTab(tab)"
      >
        {{ tab }}
      </button>
    </nav>

    <!-- =======================
         SECTIONS
    ======================== -->

    <OverviewSection
      v-if="activeTab === 'Overview'"
    />

    <ContractsSection
      v-else-if="activeTab === 'Contracts'"
      :contracts="activeContracts"
      @create-contract="openContractModal"
      @view-contract="openContractViewer"
    />

    <JobsSection
      v-else-if="activeTab === 'My Jobs'"
      :jobs="jobs"
      @apply-job="startApply"
    />

    <RechargerJobsSection
      v-else-if="activeTab === 'Find a job'"
      :jobs="jobs"
      @apply-job="startApply"
    />

    <MessagesSection
      v-else-if="activeTab === 'Messages'"
      :conversations="conversations"
      :active-conversation="activeConversation"
      :thread="threads[activeConversation?.name] || []"
      @select-conversation="selectConversation"
      @send-message="handleSendMessage"
    />

    <ProfileSection
      v-else-if="activeTab === 'Profile'"
      :profile="profile"
      @save-profile="handleProfileSave"
    />

    <DaoDisputesSection
      v-else-if="activeTab === 'DAO'"
      :disputes="daoDisputes"
    />

    <AdminSection
      v-else
      :cards="adminStats"
      :disputes="daoDisputes"
      :transactions="adminTransactions"
    />

    <!-- APPLY MODAL -->
    <div v-if="showApplyModal" class="apply-overlay" @click.self="closeApplyModal">
      <div class="apply-card">
        <header class="apply-head">
          <h3>{{ selectedJob?.title }}</h3>
          <button @click="closeApplyModal">x</button>
        </header>
        <textarea v-model="applyMessage" rows="4"></textarea>
        <button class="primary-btn" @click="handleJobApplication">
          Envoyer
        </button>
      </div>
    </div>

    <!-- CONTRACT CREATION -->
    <div v-if="showContractModal" class="overlay" @click.self="closeContractModal">
      <ContractCreationModal
        :employers="employers"
        :freelancer-wallet="freelancerWallet"
        :program-id="programId"
        :usdc-mint="usdcMint"
        :network="walletConfig.network"
        :rpc-url="walletConfig.rpcUrl"
        :admin1="walletConfig.admin1"
        :admin2="walletConfig.admin2"
        @created="handleContractSubmit"
        @close="closeContractModal"
      />
    </div>

    <!-- CONTRACT VIEWER -->
    <div v-if="showContractViewer" class="overlay" @click.self="closeContractViewer">
      <ContractPreviewModal
        :contract="activeContractPreview"
        @close="closeContractViewer"
      />
    </div>

  </div>
</template>


<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto 48px;
  padding: 8px;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.work-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  min-width: 72px;
  border-radius: 14px;
  background: radial-gradient(circle at 30% 30%, rgba(120, 90, 255, 0.5), rgba(0, 198, 255, 0.35)),
    linear-gradient(145deg, rgba(24, 33, 64, 0.9), rgba(18, 26, 54, 0.96));
  color: #eef2ff;
  font-weight: 800;
  letter-spacing: 0.08em;
  font-size: 12px;
  box-shadow:
    0 14px 32px rgba(0, 0, 0, 0.35),
    0 0 12px rgba(120, 90, 255, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.profile {
  height: 40px;
  width: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1f3246, #2f4f6c);
  display: grid;
  place-items: center;
  color: #e9f2ff;
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.metric-card {
  background: linear-gradient(160deg, #0a0f1f 0%, #0b1328 100%);
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 14px;
  padding: 18px 18px 16px;
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.45),
    0 0 20px rgba(120, 90, 255, 0.28);
}

.metric-top {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-bottom: 14px;
}

.metric-label {
  color: #8f9cb8;
  font-size: 13px;
}

.metric-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  min-width: 32px;
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(106, 72, 255, 0.2), rgba(0, 198, 255, 0.16));
  border: 1px solid rgba(120, 90, 255, 0.4);
  white-space: nowrap;
}

.metric-icon::before {
  content: attr(data-icon);
  color: #a782ff;
  font-size: 11px;
  line-height: 1;
  text-transform: capitalize;
}

.metric-value {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-size: 26px;
  font-weight: 800;
  margin-bottom: 6px;
  letter-spacing: 0.4px;
}

.metric-change {
  font-size: 12px;
  color: #8f9cb8;
}

.metric-change.up {
  color: #99f0ff;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 12px 0 22px;
}

.admin-cta {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 18px;
}

.tab {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(120, 90, 255, 0.18);
  color: #9babc8;
  padding: 10px 18px;
  border-radius: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25);
}

.tab:hover {
  color: #dfe7ff;
  border-color: rgba(120, 90, 255, 0.3);
}

.tab.active {
  color: #061227;
  background: linear-gradient(90deg, #6a48ff, #00c6ff);
  border-color: rgba(120, 90, 255, 0.5);
  box-shadow:
    0 10px 24px rgba(0, 102, 255, 0.28),
    0 0 12px rgba(106, 72, 255, 0.25);
}

@media (max-width: 720px) {
  .page {
    padding: 0;
  }

  .metrics {
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  }
}

.apply-overlay,
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 16, 0.78);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 18px;
  z-index: 30;
}

.apply-card {
  width: min(520px, 100%);
  background: radial-gradient(circle at 20% 20%, rgba(120, 90, 255, 0.14), rgba(0, 198, 255, 0)) ,
    linear-gradient(165deg, rgba(7, 10, 24, 0.97), rgba(10, 18, 36, 0.95));
  border: 1px solid rgba(120, 90, 255, 0.35);
  border-radius: 18px;
  box-shadow:
    0 24px 44px rgba(0, 0, 0, 0.5),
    0 0 28px rgba(120, 90, 255, 0.32);
  padding: 18px;
  color: #dfe7ff;
  display: grid;
  gap: 12px;
}

.apply-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.apply-head h3 {
  margin: 0;
  color: #eae7ff;
}

.close-btn {
  height: 32px;
  width: 32px;
  border-radius: 50%;
  border: 1px solid rgba(120, 90, 255, 0.45);
  background: rgba(120, 90, 255, 0.18);
  color: #e2dbff;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #9fb0cc;
}

.field span {
  font-weight: 700;
  color: #dfe7ff;
}

.field textarea {
  resize: vertical;
  min-height: 120px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(120, 90, 255, 0.35);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  padding: 12px 14px;
  color: #eae7ff;
  font-size: 14px;
}

.profile-share {
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 12px;
  padding: 12px 12px;
  background: linear-gradient(160deg, rgba(120, 90, 255, 0.14), rgba(0, 198, 255, 0.08));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
}

.apply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.apply-actions .primary-btn {
  padding: 10px 16px;
  border-radius: 12px;
  background: linear-gradient(90deg, #6a48ff, #00c6ff);
  color: #061227;
  border: 1px solid rgba(120, 90, 255, 0.4);
}

.apply-actions .ghost-btn {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: #e2dbff;
}
</style>
