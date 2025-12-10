<script setup>
import { ref, computed, onMounted, watch } from "vue"
import { useAuthStore } from "../store/auth"
import { useConversationStore } from "../store/conversations"
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

// MODALS
import ContractCreationModal from "./ContractCreationModal.vue"
import ContractPreviewModal from "./ContractPreviewModal.vue"

// AUTH SCREEN
import AuthLanding from "./AuthLanding.vue"

// ==========================
// AUTH
// ==========================
const auth = useAuthStore()
const showAuth = ref(!auth.isLogged)

const baseProfile = () => ({
  name: auth.user?.username || "User",
  title: "",
  location: "",
  rate: "",
  availability: "",
  bio: "",
  skills: [],
  highlights: [],
  portfolio: [],
})

const normalizeList = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      // ignore malformed JSON and fallback to comma split
    }
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

const mapUserToProfile = (user) => {
  if (!user) return baseProfile()
  const rate = typeof user.rate_hourly_usd === "number" && !Number.isNaN(user.rate_hourly_usd)
    ? `${user.rate_hourly_usd} USDC/hr`
    : user.rate_hourly_usd_label || user.rate || ""
  let portfolio = []
  if (Array.isArray(user.portfolio)) {
    portfolio = user.portfolio
  } else if (typeof user.portfolio === "string" && user.portfolio.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(user.portfolio)
      portfolio = Array.isArray(parsed) ? parsed : []
    } catch (error) {
      portfolio = []
    }
  }
  return {
    name: user.username || user.name || baseProfile().name,
    title: user.title || "",
    location: user.location || "",
    rate,
    availability: user.availability || "",
    bio: user.bio || user.about || "",
    skills: normalizeList(user.skills),
    highlights: normalizeList(user.highlights),
    portfolio,
  }
}

const formatProfileForSave = (profilePayload) => {
  const parseRate = (label) => {
    if (!label) return null
    const numeric = parseFloat(String(label).replace(/[^\d.]/g, ""))
    return Number.isFinite(numeric) ? numeric : null
  }
  const rateValue = parseRate(profilePayload.rate)
  return {
    username: profilePayload.name,
    title: profilePayload.title,
    location: profilePayload.location,
    availability: profilePayload.availability,
    bio: profilePayload.bio,
    about: profilePayload.bio,
    rate_hourly_usd: rateValue,
    rate_hourly_usd_label: profilePayload.rate,
    skills: profilePayload.skills,
    highlights: profilePayload.highlights,
    portfolio: profilePayload.portfolio,
  }
}

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
// PROFILE
// ==========================
const profileDetails = ref(baseProfile())
const profileView = computed(() => profileDetails.value || baseProfile())

const profile = computed(() => ({
  username: profileView.value.name || auth.user?.username || "User",
  wallet: auth.user?.walletAddress,
  chain: auth.user?.chain || DEFAULT_CHAIN,
}))

// ==========================
// CONTRACTS
// ==========================
const activeContracts = ref([])

// ==========================
// WALLETS FOR CONTRACT MODAL
// ==========================
const freelancerWallet = computed(() => auth.user?.walletAddress || "")

const walletConfig = ref({
  usdcMint: "",
  programId: "",
  rpcUrl: import.meta.env.VITE_SOLANA_RPC || "https://api.devnet.solana.com",
  network: DEFAULT_CHAIN,
  admin1: "",
  admin2: "",
})

const programId = computed(() => walletConfig.value.programId)
const usdcMint = computed(() => walletConfig.value.usdcMint)

// ==========================
// MODALS STATE
// ==========================
const showCreateContract = ref(false)
const showContractViewer = ref(false)
const previewContract = ref(null)

// ==========================
// CONVERSATIONS
// ==========================
const conversationStore = useConversationStore()
const friendOptions = computed(() => conversationStore.friendOptions)
const messageConversations = computed(() => conversationStore.conversationList)
const activeConversation = computed(() => conversationStore.activeConversation)
const activeThread = computed(() => conversationStore.activeThread)
const unreadCount = computed(() => conversationStore.totalUnread)

// ==========================
// LOADERS
// ==========================
async function loadMyContracts() {
  if (!auth.isLogged) return
  try {
    const res = await api.get("/api/contracts/me")
    activeContracts.value = res.data || []
  } catch (e) {
    console.error("Load contracts failed", e)
  }
}

async function loadWalletConfig() {
  try {
    const { data } = await api.get("/api/wallet/config")
    walletConfig.value = {
      usdcMint: data.usdcMint || "",
      programId: data.programId || "",
      rpcUrl: data.rpcUrl || walletConfig.value.rpcUrl,
      network: data.network || DEFAULT_CHAIN,
      admin1: data.admin1 || "",
      admin2: data.admin2 || "",
    }
  } catch (e) {
    console.error("Load wallet config failed", e)
  }
}

async function loadProfile() {
  if (!auth.isLogged || !auth.user?.uuid) {
    profileDetails.value = baseProfile()
    return
  }
  try {
    const { data } = await api.get(`/users/${auth.user.uuid}`)
    profileDetails.value = mapUserToProfile(data)
  } catch (error) {
    console.error("Failed to load profile", error)
    profileDetails.value = mapUserToProfile({
      username: auth.user?.username,
    })
  }
}

// ==========================
async function loadMessagingData() {
  if (!auth.isLogged) return
  try {
    await conversationStore.fetchConversations()
    conversationStore.fetchFriends()
  } catch (error) {
    console.error("Failed to load messaging data", error)
  }
}

// ==========================
// MODAL ACTIONS
// ==========================
function openCreateContract() {
  if (!walletConfig.value.programId || !walletConfig.value.usdcMint) {
    alert("Configuration Solana manquante. Contacte un admin.")
    return
  }
  showCreateContract.value = true
}

function closeCreateContract() {
  showCreateContract.value = false
}

function createContractSuccess(contract) {
  activeContracts.value.push(contract)
  showCreateContract.value = false
}

function openContractPreview(contract) {
  previewContract.value = contract
  showContractViewer.value = true
}

function closeContractPreview() {
  previewContract.value = null
  showContractViewer.value = false
}

// ==========================
// LOGIN SUCCESS
// ==========================
function handleConnected({ user, token }) {
  showAuth.value = false
  loadWalletConfig()
  loadMyContracts()
  loadMessagingData()
  loadProfile()
}

async function handleSelectConversation(conversation) {
  try {
    await conversationStore.selectConversation(conversation)
  } catch (error) {
    console.error(error)
  }
}

async function handleSendMessage(body) {
  try {
    await conversationStore.sendMessage(body)
  } catch (error) {
    alert("Unable to send the message right now.")
    console.error(error)
  }
}

async function handleStartFriendChat(friendId) {
  if (!friendId) return
  try {
    await conversationStore.createPrivateConversation(friendId)
  } catch (error) {
    console.error(error)
    alert("Impossible d'ouvrir la conversation.")
  }
}

async function handleDeleteMessage(payload) {
  try {
    await conversationStore.deleteMessage(payload)
  } catch (error) {
    console.error(error)
    alert("Suppression impossible.")
  }
}

async function handleSaveProfile(updatedProfile) {
  if (!auth.user?.uuid) return
  try {
    const payload = formatProfileForSave(updatedProfile)
    const { data } = await api.put(`/users/${auth.user.uuid}`, payload)
    profileDetails.value = mapUserToProfile(data || { ...updatedProfile })
  } catch (error) {
    console.error("Failed to save profile", error)
    alert("La sauvegarde du profil a échoué.")
  }
}

// ==========================
// WATCH LOGIN
// ==========================
watch(
  () => auth.isLogged,
  (logged) => {
    showAuth.value = !logged
    if (logged) {
      loadWalletConfig()
      loadMyContracts()
      loadMessagingData()
      loadProfile()
    } else {
      conversationStore.reset()
      profileDetails.value = baseProfile()
    }
  },
)

// ==========================
// MOUNT
// ==========================
onMounted(() => {
  if (auth.isLogged) {
    loadWalletConfig()
    loadMyContracts()
    loadMessagingData()
    loadProfile()
  }
})
</script>

<template>
  <!-- AUTH REQUIRED -->
  <AuthLanding
    v-if="showAuth"
    @connected="handleConnected"
  />

  <div v-else class="page">

    <!-- HEADER -->
    <header class="top-bar">
      <div class="work-pill">WORK</div>

      <div class="profile">
        {{ profile.username?.substring(0, 2).toUpperCase() }}
      </div>
    </header>

    <!-- NAVIGATION -->
    <nav class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="['tab', { active: activeTab === tab }]"
        @click="activeTab = tab"
      >
        <span>{{ tab }}</span>
        <span
          v-if="tab === 'Messages' && unreadCount"
          class="tab-badge"
        >
          {{ unreadCount }}
        </span>
      </button>
    </nav>

    <!-- ======================
         SECTIONS
    ======================= -->
    <OverviewSection v-if="activeTab === 'Overview'" />

    <ContractsSection
      v-else-if="activeTab === 'Contracts'"
      :contracts="activeContracts"
      @create-contract="openCreateContract"
      @view-contract="openContractPreview"
    />

    <JobsSection v-else-if="activeTab === 'My Jobs'" />

    <RechargerJobsSection v-else-if="activeTab === 'Find a job'" />

    <MessagesSection
      v-else-if="activeTab === 'Messages'"
      :conversations="messageConversations"
      :thread="activeThread"
      :active-conversation="activeConversation"
      :friends="friendOptions"
      @select-conversation="handleSelectConversation"
      @send-message="handleSendMessage"
      @start-friend-chat="handleStartFriendChat"
      @delete-message="handleDeleteMessage"
    />

    <ProfileSection
      v-else-if="activeTab === 'Profile'"
      :profile="profileView"
      @save-profile="handleSaveProfile"
    />

    <DaoDisputesSection v-else-if="activeTab === 'DAO'" />

    <AdminSection v-else :cards="[]" :disputes="[]" :transactions="[]" />

    <!-- ==========================
         MODAL : CREATE CONTRACT
    ========================== -->
    <div
      v-if="showCreateContract"
      class="overlay"
      @click.self="closeCreateContract"
    >
      <ContractCreationModal
        :employers="friendOptions"
        :freelancer-wallet="freelancerWallet"
        :program-id="programId"
        :usdc-mint="usdcMint"
        :rpc-url="walletConfig.rpcUrl"
        :network="walletConfig.network"
        :admin1="walletConfig.admin1"
        :admin2="walletConfig.admin2"
        @created="createContractSuccess"
        @close="closeCreateContract"
      />
    </div>

    <!-- ==========================
         MODAL : PREVIEW CONTRACT
    ========================== -->
    <div
      v-if="showContractViewer"
      class="overlay"
      @click.self="closeContractPreview"
    >
      <ContractPreviewModal
        :contract="previewContract"
        @close="closeContractPreview"
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
  display: inline-flex;
  align-items: center;
  gap: 8px;
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

.tab-badge {
  min-width: 20px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 11px;
  text-align: center;
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
