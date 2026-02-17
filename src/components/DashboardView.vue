<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue"
import { storeToRefs } from "pinia"
import { useAuthStore } from "../store/auth"
import { useConversationStore } from "../store/conversations"
import { deleteConversation as deleteConversationApi } from "../services/conversationsApi"
import { useProfileStore } from "../store/profile"
import { useWalletConfigStore } from "../store/walletConfig"
import { useContractsStore } from "../store/contracts"
import { useJobsStore } from "../store/jobs"
import { getConnection } from "../solana/connection"
import { connectPhantom, getPhantomProvider } from "../solana/phantom"
import { getUsdcBalance } from "../solana/usdc"
import byhnexLogo from "../assets/byhnexLogo.png"

// SECTIONS
import OverviewSection from "./OverviewSection.vue"
import ContractsSection from "./ContractsSection.vue"
import JobsSection from "./JobsSection.vue"
import SearchJobsSection from "./SearchJobsSection.vue"
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
const showAuth = ref(!auth.isAuthenticated)

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
// PROFILE (NEW: /api/profiles/me via store)
// ==========================
const profileStore = useProfileStore()

// ce que tu passes au composant ProfileSection
const profileView = computed(() => profileStore.profile)

// ce que tu utilises pour l'avatar en haut
const profile = computed(() => ({
  username: profileView.value?.name || auth.user?.username || "User",
  wallet: auth.user?.walletAddress,
  chain: auth.user?.chain || walletConfigSafe.value.chain || null,
}))

async function loadProfile() {
  if (!auth.isAuthenticated) return
  await profileStore.fetchMe()
}

async function handleSaveProfile(updatedProfile) {
  try {
    await profileStore.saveMe(updatedProfile)
  } catch (error) {
    alert("La sauvegarde du profil a échoué.")
    console.error(error)
  }
}

// ==========================
// CONTRACTS
// ==========================
const contractsStore = useContractsStore()
const activeContracts = computed(() => contractsStore.myContracts)
const visibleContracts = computed(() =>
  activeContracts.value.length ? activeContracts.value : contractsStore.items,
)
const jobsStore = useJobsStore()
const totalApplicantsOnMyJobs = computed(() =>
  (jobsStore.myJobs || []).reduce((sum, job) => sum + Number(job?.applicantsCount || 0), 0),
)

// ==========================
// WALLETS FOR CONTRACT MODAL
// ==========================
const freelancerWallet = computed(() => auth.user?.walletAddress || "")

const walletConfigStore = useWalletConfigStore()
const { config: walletConfig, loading: walletConfigLoading, error: walletConfigError } =
  storeToRefs(walletConfigStore)
const walletConfigSafe = computed(() => walletConfig.value || {})

const isPlaceholderKey = (value) =>
  !value || value === "11111111111111111111111111111111"


// ==========================
// WALLET GUARD (SOURCE DE VERITE)
// ==========================
const phantomAddress = ref("")
const phantomNetwork = ref("")
const phantomUsdcBalance = ref(null)
const walletGuardError = ref("")
const walletGuardLoading = ref(false)

const walletGuardOk = computed(
  () => !walletGuardLoading.value && !walletGuardError.value && !!phantomAddress.value,
)
const overviewWallet = computed(() => ({
  address: phantomAddress.value,
  chain: phantomNetwork.value || walletConfigSafe.value.chain || "",
  balance: phantomUsdcBalance.value,
  loading: walletGuardLoading.value,
  error: walletGuardError.value,
}))

const refreshWalletGuard = async () => {
  if (walletGuardLoading.value) return

  walletGuardLoading.value = true
  walletGuardError.value = ""

  try {
    const phantom = getPhantomProvider()
    if (!phantom) {
      walletGuardError.value = "Phantom non détecté."
      if (auth.isAuthenticated) await performLogout({ disconnectWallet: false })
      return
    }

    let publicKey = phantom.publicKey
    if (!publicKey) {
      const trusted = await Promise.race([
        connectPhantom({ onlyIfTrusted: true, interactive: false }),
        new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
      ])
      publicKey = trusted?.publicKey || phantom.publicKey
    }

    if (!publicKey) {
      walletGuardError.value = "Phantom non connecté."
      if (auth.isAuthenticated) await performLogout({ disconnectWallet: false })
      return
    }

    phantomAddress.value = publicKey.toBase58()

    const expectedWallet = auth.user?.walletAddress
    if (expectedWallet && expectedWallet !== phantomAddress.value) {
      walletGuardError.value = "Wallet Phantom ≠ wallet du compte."
      if (auth.isAuthenticated) await performLogout({ disconnectWallet: false })
      return
    }

    if (!walletConfigSafe.value.rpcUrl || !walletConfigSafe.value.usdcMint) {
      walletGuardError.value = "Config wallet manquante."
      return
    }

    const connection = getConnection(walletConfigSafe.value.rpcUrl)
    phantomNetwork.value = walletConfigSafe.value.chain || ""

    const balanceInfo = await getUsdcBalance({
      wallet: phantomAddress.value,
      mintAddress: walletConfigSafe.value.usdcMint,
      connection,
    })
    phantomUsdcBalance.value = balanceInfo.amount
  } catch (e) {
    walletGuardError.value = e?.message || "Erreur de vérification wallet."
    if (auth.isAuthenticated) await performLogout({ disconnectWallet: false })
  } finally {
    walletGuardLoading.value = false
  }
}

function attachPhantomSessionListeners() {
  const phantom = getPhantomProvider()
  if (!phantom?.on) return
  if (phantomDisconnectHandler || phantomAccountChangedHandler) return

  phantomDisconnectHandler = async () => {
    if (!auth.isAuthenticated) return
    await performLogout({ disconnectWallet: false })
  }

  phantomAccountChangedHandler = async (publicKey) => {
    if (!auth.isAuthenticated) return
    if (!publicKey) {
      await performLogout({ disconnectWallet: false })
      return
    }

    const connectedWallet = publicKey?.toBase58?.() || ""
    const expectedWallet = auth.user?.walletAddress || ""
    if (expectedWallet && connectedWallet && expectedWallet !== connectedWallet) {
      await performLogout({ disconnectWallet: false })
    }
  }

  phantom.on("disconnect", phantomDisconnectHandler)
  phantom.on("accountChanged", phantomAccountChangedHandler)
}

function detachPhantomSessionListeners() {
  const phantom = getPhantomProvider()
  if (!phantom?.off) return

  if (phantomDisconnectHandler) {
    phantom.off("disconnect", phantomDisconnectHandler)
    phantomDisconnectHandler = null
  }
  if (phantomAccountChangedHandler) {
    phantom.off("accountChanged", phantomAccountChangedHandler)
    phantomAccountChangedHandler = null
  }
}

function startWalletSessionPolling() {
  if (walletSessionInterval) return
  walletSessionInterval = setInterval(() => {
    if (!auth.isAuthenticated) return
    refreshWalletGuard()
  }, 15000)
}

function stopWalletSessionPolling() {
  if (!walletSessionInterval) return
  clearInterval(walletSessionInterval)
  walletSessionInterval = null
}

function handleWindowFocus() {
  if (!auth.isAuthenticated) return
  refreshWalletGuard()
}

// ==========================
// MODALS STATE
// ==========================
const showCreateContract = ref(false)
const showContractViewer = ref(false)
const previewContract = ref(null)
const logoutInProgress = ref(false)
let phantomDisconnectHandler = null
let phantomAccountChangedHandler = null
let walletSessionInterval = null

// ==========================
// CONVERSATIONS
// ==========================
const conversationStore = useConversationStore()
const friendOptions = computed(() => conversationStore.friendOptions)
const contractEmployers = computed(() =>
  friendOptions.value
    .map((friend) => ({
      uuid: friend.uuid,
      walletAddress: friend.walletAddress,
      label: friend.label,
    }))
    .filter((friend) => !!friend.uuid && !!friend.walletAddress),
)

// ⚠️ selon ton store :
// - si tu as conversationPreviews + activeMessages -> adapte ici
// - là je garde tes noms présents dans ton dashboard (conversationList, activeThread, totalUnread)
const messageConversations = computed(() => conversationStore.conversationList)
const activeConversation = computed(() => conversationStore.activeConversation)
const activeThread = computed(() => conversationStore.activeThread)
const unreadCount = computed(() => conversationStore.totalUnread)

// ==========================
// LOADERS
// ==========================
async function loadMyContracts() {
  if (!auth.isAuthenticated) return
  try {
    await contractsStore.fetchAll()
  } catch (e) {
    console.error("Load contracts failed", e)
  }
}

async function loadMyJobsSummary() {
  if (!auth.isAuthenticated) return
  try {
    await jobsStore.fetchMine()
  } catch (e) {
    console.error("Load jobs summary failed", e)
  }
}

async function loadWalletConfig() {
  try {
    await walletConfigStore.fetchWalletConfig({ auth: true, force: true })
    console.log("✅ Wallet config loaded:", walletConfig.value)
  } catch (e) {
    console.error("❌ Load wallet config failed", e)
  }
}

async function loadMessagingData() {
  if (!auth.isAuthenticated) return

  // si ton store a bien cette méthode, garde-la, sinon supprime cette ligne
  if (typeof conversationStore.setMyUuid === "function") {
    conversationStore.setMyUuid(auth.userUuid)
  }

  await conversationStore.fetchFriends()
  await conversationStore.fetchConversations()
}

// ==========================
// MODAL ACTIONS
// ==========================
function openCreateContract() {
  if (walletConfigLoading.value) {
    alert("Chargement de la config wallet...")
    return
  }
  if (walletConfigError.value) {
    alert("Configuration Solana indisponible.")
    return
  }
  if (walletGuardLoading.value) {
    alert("Vérification wallet en cours...")
    return
  }
  if (!walletGuardOk.value) {
    alert(walletGuardError.value || "Wallet Phantom non validé.")
    return
  }

  if (!contractEmployers.value.length) {
    alert("Aucun freelance disponible. Vérifie la liste /api/friends.")
    return
  }

  console.group("🧪 Solana config check")

  console.log("programId:", walletConfigSafe.value.programId)
  console.log("usdcMint:", walletConfigSafe.value.usdcMint)
  console.log("rpcUrl:", walletConfigSafe.value.rpcUrl)
  console.log("chain:", walletConfigSafe.value.chain)
  console.log("feeVaultAta:", walletConfigSafe.value.feeVaultAta)
  console.log("feeBps:", walletConfigSafe.value.feeBps)
  console.log("feePlatformBps:", walletConfigSafe.value.feePlatformBps)
  console.log("disputeFeeBps:", walletConfigSafe.value.disputeFeeBps)
  console.log("feeWallet:", walletConfigSafe.value.feeWallet)
  console.log("admin1:", walletConfigSafe.value.admin1)
  console.log("admin2:", walletConfigSafe.value.admin2)

  const checks = {
    programId: isPlaceholderKey(walletConfigSafe.value.programId),
    usdcMint: isPlaceholderKey(walletConfigSafe.value.usdcMint),
    rpcUrl: !walletConfigSafe.value.rpcUrl,
    chain: !walletConfigSafe.value.chain,
    feeVaultAta: isPlaceholderKey(walletConfigSafe.value.feeVaultAta),
    feeBps: !Number.isFinite(Number(walletConfigSafe.value.feeBps ?? walletConfigSafe.value.feePlatformBps)),
    admin1: isPlaceholderKey(walletConfigSafe.value.admin1),
    admin2: isPlaceholderKey(walletConfigSafe.value.admin2),
  }

  console.table(checks)

  const hasError = Object.values(checks).some(Boolean)

  if (hasError) {
    console.error("❌ Solana config invalide", checks)
    console.groupEnd()
    alert("Configuration Solana manquante. Contacte un admin.")
    return
  }

  console.log("✅ Solana config OK, ouverture du modal")
  console.groupEnd()

  showCreateContract.value = true
}

function closeCreateContract() {
  showCreateContract.value = false
}

function createContractSuccess(contract) {
  if (contract) contractsStore.upsert(contract)
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

async function handleContractUpdated() {
  await loadMyContracts()
  if (!previewContract.value) return

  const currentId = previewContract.value.uuid || previewContract.value.id
  if (!currentId) return

  const updated = contractsStore.items.find(
    (contract) => contract.uuid === currentId || contract.id === currentId,
  )
  if (updated) previewContract.value = updated
}

// ==========================
// LOGIN SUCCESS
// ==========================
function handleConnected() {
  showAuth.value = false
}

async function performLogout({ disconnectWallet = true } = {}) {
  if (logoutInProgress.value) return
  logoutInProgress.value = true
  try {
    detachPhantomSessionListeners()
    if (disconnectWallet) {
      const phantom = getPhantomProvider()
      await phantom?.disconnect?.()
    }
  } catch {
    // no-op
  } finally {
    stopWalletSessionPolling()
    auth.logout()
    showAuth.value = true
    activeTab.value = "Overview"
    logoutInProgress.value = false
  }
}

async function handleLogout() {
  try {
    await performLogout({ disconnectWallet: true })
  } catch {}
}

async function handleSelectConversation(conversationId) {
  await conversationStore.selectConversation(conversationId)
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
    if (typeof conversationStore.openOrCreatePrivateConversation === "function") {
      await conversationStore.openOrCreatePrivateConversation(friendId)
      activeTab.value = "Messages"
      return
    }
    await conversationStore.createPrivateConversation(friendId)
    activeTab.value = "Messages"
  } catch (error) {
    console.error(error)
    alert("Impossible d'ouvrir la conversation.")
  }
}

async function handleDeleteMessage(messageId) {
  try {
    await conversationStore.deleteMessage(messageId)
  } catch (error) {
    console.error(error)
    alert("Suppression impossible.")
  }
}

async function handleDeleteConversation(conversationId) {
  if (!conversationId) return
  if (!confirm("Supprimer cette conversation ?")) return
  try {
    if (typeof conversationStore.deleteConversation === "function") {
      await conversationStore.deleteConversation(conversationId)
      return
    }

    // Fallback HMR: action store non injectée, on supprime via API puis local store.
    await deleteConversationApi(conversationId)
    if (typeof conversationStore.deleteConversationLocal === "function") {
      conversationStore.deleteConversationLocal(conversationId)
    }
  } catch (error) {
    console.error(error)
    alert("Suppression de conversation impossible.")
  }
}

function handleOverviewViewAllWallet() {
  activeTab.value = "Contracts"
}

function handleOverviewViewAllTransactions() {
  activeTab.value = "Messages"
}

// ==========================
// WATCH LOGIN
// ==========================
watch(
  () => auth.isAuthenticated,
  (logged) => {
    showAuth.value = !logged
    if (logged) {
      attachPhantomSessionListeners()
      startWalletSessionPolling()
      loadWalletConfig()
      refreshWalletGuard()
      loadMyContracts()
      loadMyJobsSummary()
      loadMessagingData()
      loadProfile()
    } else {
      detachPhantomSessionListeners()
      stopWalletSessionPolling()
      conversationStore.reset()
      profileStore.reset()
      contractsStore.reset()
      activeTab.value = "Overview"
    }
  },
)

// ==========================
// MOUNT
// ==========================
onMounted(() => {
  window.addEventListener("focus", handleWindowFocus)
  if (auth.isAuthenticated) {
    attachPhantomSessionListeners()
    startWalletSessionPolling()
    loadWalletConfig()
    refreshWalletGuard()
    loadMyContracts()
    loadMyJobsSummary()
    loadMessagingData()
    loadProfile()
  }
})

watch(
  () => auth.user?.walletAddress,
  () => {
    if (auth.isAuthenticated) refreshWalletGuard()
  },
)

watch(
  [
    () => walletConfigSafe.value.rpcUrl,
    () => walletConfigSafe.value.usdcMint,
    () => walletConfigSafe.value.chain,
  ],
  () => {
    if (auth.isAuthenticated) refreshWalletGuard()
  },
)

onBeforeUnmount(() => {
  window.removeEventListener("focus", handleWindowFocus)
  detachPhantomSessionListeners()
  stopWalletSessionPolling()
})
</script>

<template>
  <!-- AUTH REQUIRED -->
  <AuthLanding v-if="showAuth" @connected="handleConnected" />

  <div v-else class="page">
    <!-- HEADER -->
    <header class="top-bar">
      <div class="work-pill">
        <img :src="byhnexLogo" alt="Byhnex logo" class="work-logo" />
        <span class="work-text">Byhnex</span>
      </div>

      <div class="top-actions">
        <button class="logout-btn" @click="handleLogout">Deconnexion</button>
        <div
          class="profile profile-clickable"
          role="button"
          tabindex="0"
          @click="activeTab = 'Profile'"
          @keydown.enter.prevent="activeTab = 'Profile'"
          @keydown.space.prevent="activeTab = 'Profile'"
        >
          {{ profile.username?.substring(0, 2).toUpperCase() }}
        </div>
      </div>
    </header>

    <section class="wallet-guard" :class="{ bad: !!walletGuardError }">
      <div class="wallet-guard-title">Wallet Phantom</div>
      <div class="wallet-guard-row">
        <span>Adresse</span>
        <span>{{ phantomAddress || "Non connecté" }}</span>
      </div>
      <div class="wallet-guard-row">
        <span>Réseau</span>
        <span>{{ phantomNetwork || walletConfigSafe.chain }}</span>
      </div>
      <div class="wallet-guard-row">
        <span>USDC</span>
        <span>
          {{
            phantomUsdcBalance === null
              ? "—"
              : `${Number(phantomUsdcBalance).toFixed(2)} USDC`
          }}
        </span>
      </div>
      <div v-if="walletGuardError" class="wallet-guard-stop">
        STOP: {{ walletGuardError }}
      </div>
      <button
        class="wallet-guard-refresh"
        :disabled="walletGuardLoading"
        @click="refreshWalletGuard"
      >
        {{ walletGuardLoading ? "Vérification..." : "Rafraîchir" }}
      </button>
    </section>

    <!-- NAVIGATION -->
    <nav class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="['tab', { active: activeTab === tab }]"
        @click="activeTab = tab"
      >
        <span>{{ tab }}</span>
        <span v-if="tab === 'Messages' && unreadCount" class="tab-badge">
          {{ unreadCount }}
        </span>
      </button>
    </nav>

    <!-- ======================
         SECTIONS
    ======================= -->
    <OverviewSection
      v-if="activeTab === 'Overview'"
      :contracts="visibleContracts"
      :conversations="messageConversations"
      :wallet="overviewWallet"
      :applicants-count="totalApplicantsOnMyJobs"
      :unread-messages="unreadCount"
      @view-all-wallet="handleOverviewViewAllWallet"
      @view-all-transactions="handleOverviewViewAllTransactions"
      @view-contract="openContractPreview"
    />

    <ContractsSection
      v-else-if="activeTab === 'Contracts'"
      :contracts="visibleContracts"
      @create-contract="openCreateContract"
      @view-contract="openContractPreview"
    />

    <JobsSection
      v-else-if="activeTab === 'My Jobs'"
      @open-applicant-chat="handleStartFriendChat"
    />

    <SearchJobsSection v-else-if="activeTab === 'Find a job'" />

    <MessagesSection
      v-else-if="activeTab === 'Messages'"
      :conversations="messageConversations"
      :thread="activeThread"
      :active-conversation="activeConversation"
      :friends="friendOptions"
      @select-conversation="handleSelectConversation"
      @send-message="handleSendMessage"
      @start-friend-chat="handleStartFriendChat"
      @delete-conversation="handleDeleteConversation"
      @delete-message="handleDeleteMessage"
    />

    <ProfileSection
      v-else-if="activeTab === 'Profile'"
      :profile="profileView"
      :loading="profileStore.loading"
      :saving="profileStore.saving"
      :error="profileStore.error"
      @save-profile="handleSaveProfile"
    />

    <DaoDisputesSection v-else-if="activeTab === 'DAO'" />

    <AdminSection v-else :cards="[]" :disputes="[]" :transactions="[]" />

    <!-- ==========================
         MODAL : CREATE CONTRACT
    ========================== -->
    <div v-if="showCreateContract" class="overlay" @click.self="closeCreateContract">
     <ContractCreationModal
  :employers="contractEmployers"
  :program-id="walletConfigSafe.programId"
  :usdc-mint="walletConfigSafe.usdcMint"
  :rpc-url="walletConfigSafe.rpcUrl"
  :chain="walletConfigSafe.chain"
  :fee-vault-ata="walletConfigSafe.feeVaultAta"
  :fee-usdc-ata="walletConfigSafe.feeUsdcAta"
  :fee-bps="walletConfigSafe.feeBps"
  :fee-platform-bps="walletConfigSafe.feePlatformBps"
  :dispute-fee-bps="walletConfigSafe.disputeFeeBps"
  :fee-wallet="walletConfigSafe.feeWallet"
  :admin1="walletConfigSafe.admin1"
  :admin2="walletConfigSafe.admin2"
  :admin1-fee-ata="walletConfigSafe.admin1FeeAta"
  :admin2-fee-ata="walletConfigSafe.admin2FeeAta"
  @created="createContractSuccess"
  @close="closeCreateContract"
/>

    </div>

    <!-- ==========================
         MODAL : PREVIEW CONTRACT
    ========================== -->
    <div v-if="showContractViewer" class="overlay" @click.self="closeContractPreview">
     <ContractPreviewModal
  :contract="previewContract"
  :program-id="walletConfigSafe.programId"
  :usdc-mint="walletConfigSafe.usdcMint"
  :rpc-url="walletConfigSafe.rpcUrl"
  :fee-wallet="walletConfigSafe.feeWallet"
  :admin1="walletConfigSafe.admin1"
  :admin2="walletConfigSafe.admin2"
  :admin1-fee-ata="walletConfigSafe.admin1FeeAta"
  :admin2-fee-ata="walletConfigSafe.admin2FeeAta"
  @updated="handleContractUpdated"
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

.top-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.logout-btn {
  height: 36px;
  border-radius: 10px;
  padding: 0 12px;
  border: 1px solid rgba(255, 120, 160, 0.35);
  background: rgba(255, 120, 160, 0.12);
  color: #ffd0e1;
  font-weight: 700;
  cursor: pointer;
}

.work-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  min-width: 120px;
  border-radius: 14px;
  background: radial-gradient(circle at 30% 30%, rgba(120, 90, 255, 0.5), rgba(0, 198, 255, 0.35)),
    linear-gradient(145deg, rgba(24, 33, 64, 0.9), rgba(18, 26, 54, 0.96));
  color: #eef2ff;
  box-shadow:
    0 14px 32px rgba(0, 0, 0, 0.35),
    0 0 12px rgba(120, 90, 255, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.work-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
  display: block;
}

.work-text {
  color: #eef2ff;
  font-weight: 800;
  letter-spacing: 0.05em;
  font-size: 12px;
  text-transform: uppercase;
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

.profile-clickable {
  cursor: pointer;
}

.wallet-guard {
  margin: 6px 0 18px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(120, 90, 255, 0.25);
  background: linear-gradient(160deg, rgba(12, 18, 36, 0.92), rgba(14, 23, 52, 0.92));
  box-shadow:
    0 12px 26px rgba(0, 0, 0, 0.35),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.wallet-guard.bad {
  border-color: rgba(255, 107, 107, 0.6);
  background: linear-gradient(160deg, rgba(52, 16, 16, 0.92), rgba(24, 10, 24, 0.92));
}

.wallet-guard-title {
  color: #d6e0ff;
  font-weight: 700;
  margin-bottom: 10px;
  letter-spacing: 0.4px;
}

.wallet-guard-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 13px;
  color: #a6b3d1;
}

.wallet-guard-row span:last-child {
  color: #e9f2ff;
  font-weight: 600;
  word-break: break-all;
}

.wallet-guard-stop {
  margin-top: 10px;
  color: #ffb4b4;
  font-weight: 700;
  font-size: 12px;
}

.wallet-guard-refresh {
  margin-top: 10px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid rgba(120, 90, 255, 0.35);
  background: rgba(18, 28, 58, 0.9);
  color: #d6e0ff;
  font-weight: 700;
  cursor: pointer;
}

.wallet-guard-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
