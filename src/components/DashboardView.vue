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
import {
  buildResolveTx as buildResolveTxApi,
  getAdminDispute as getAdminDisputeApi,
  listAdminDisputes as listAdminDisputesApi,
  resetDisputeVotes as resetDisputeVotesApi,
  resolveDispute as resolveDisputeApi,
  voteDispute as voteDisputeApi,
} from "../services/contractsApi"
import { getConnection } from "../solana/connection"
import { connectPhantom, getPhantomProvider } from "../solana/phantom"
import { getUsdcBalance } from "../solana/usdc"
import { PublicKey, Transaction } from "@solana/web3.js"
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token"
import byhnexLogo from "../assets/byhnexLogo.png"

// SECTIONS
import OverviewSection from "./OverviewSection.vue"
import ContractsSection from "./ContractsSection.vue"
import JobsSection from "./JobsSection.vue"
import SearchJobsSection from "./SearchJobsSection.vue"
import MessagesSection from "./MessagesSection.vue"
import ProfileSection from "./ProfileSection.vue"
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
const baseTabs = ["Overview", "Contracts", "My Jobs", "Find a job", "Messages", "Profile"]
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
const adminDisputeItems = ref([])
const adminDisputesLoading = ref(false)
const adminDisputesError = ref("")
const adminActionLoadingId = ref(null)

const parseAmount = (value) => {
  if (value == null) return 0
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  const cleaned = String(value).trim().replace(/\s+/g, "").replace(",", ".")
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}
const disputedContracts = computed(() =>
  adminDisputeItems.value.filter((item) => String(item?.status || "").toUpperCase() === "OPEN"),
)
const adminDisputes = computed(() =>
  disputedContracts.value.map((item) => {
    const contract = item?.contract || {}
    const votes = item?.votes || {}
    const votesFor = [votes?.admin1, votes?.admin2].filter(Boolean).length
    const adminContract = {
      ...contract,
      amountUsdc: contract?.amountUsdc ?? contract?.amounts?.totalUsdc ?? contract?.amount ?? null,
      description: contract?.description || item?.reason || "",
      checkpoints:
        contract?.checkpoints ||
        contract?.validationCheckpoints ||
        (item?.reason ? [`Litige: ${item.reason}`] : []),
      dispute: {
        ...(contract?.dispute || {}),
        id: item?.id ?? contract?.dispute?.id ?? null,
        status: item?.status || contract?.dispute?.status || "OPEN",
        reason: item?.reason ?? contract?.dispute?.reason ?? "",
        canResolve: item?.canResolve ?? contract?.dispute?.canResolve ?? false,
        votes,
      },
    }

    return {
      id: item?.id || contract?.uuid || contract?.id,
      contractUuid: contract?.uuid || contract?.id || null,
      contract: adminContract,
      votes,
      myVote: String(item?.myVote || item?.my_vote || "").toUpperCase() || null,
      name: contract?.title || contract?.contractTitle || contract?.name || "Contract",
      client:
        contract?.employer?.username ||
        contract?.employerName ||
        contract?.employer?.walletAddress ||
        "-",
      amount: `${parseAmount(contract?.amountUsdc || contract?.amounts?.totalUsdc || contract?.amount).toFixed(2)} USDC`,
      period: `${contract?.startAt || "-"} -> ${contract?.endAt || "-"}`,
      votesFor,
      totalVoters: 2,
      status: item?.status || "OPEN",
      expected: item?.reason || "-",
      delivered: item?.resolutionType || "-",
    }
  }),
)
const resolvedDisputesCount = computed(
  () => adminDisputeItems.value.filter((item) => String(item?.status || "").toUpperCase() === "RESOLVED").length,
)
const adminCards = computed(() => [
  {
    tag: "Disputes",
    title: "Litiges ouverts",
    value: adminDisputesLoading.value ? "..." : String(adminDisputes.value.length),
    subtext: adminDisputesError.value || "Contrats en état de dispute",
  },
  {
    tag: "Arbitrage",
    title: "Décisions résolues",
    value: adminDisputesLoading.value ? "..." : String(resolvedDisputesCount.value),
    subtext: "Résolutions finalisées",
  },
])
const adminTransactions = computed(() => [])
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
const normalizeComparable = (value) => String(value || "").trim().toLowerCase()
const isAdminUser = computed(() => {
  const user = auth.user || {}
  const userUuid = user?.uuid || user?.userUuid || user?.id || auth.userUuid || null
  const userWallet = user?.walletAddress || user?.wallet_address || null
  const userIsAdmin = Boolean(user?.is_admin ?? user?.isAdmin)

  if (userIsAdmin) return true

  const admin1Uuid = walletConfigSafe.value.admin1UserUuid
  const admin2Uuid = walletConfigSafe.value.admin2UserUuid
  const uuids = [admin1Uuid, admin2Uuid].map(normalizeComparable).filter(Boolean)
  if (normalizeComparable(userUuid) && uuids.includes(normalizeComparable(userUuid))) return true

  const admin1Wallet = walletConfigSafe.value.admin1
  const admin2Wallet = walletConfigSafe.value.admin2
  const wallets = [admin1Wallet, admin2Wallet].map(normalizeComparable).filter(Boolean)
  if (normalizeComparable(userWallet) && wallets.includes(normalizeComparable(userWallet))) return true

  return false
})
const tabs = computed(() => (isAdminUser.value ? [...baseTabs, "Admin"] : [...baseTabs]))

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
const previewAdminReadonly = ref(false)
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
const walletCompactAddress = computed(() => {
  const raw = String(phantomAddress.value || "").trim()
  if (!raw) return "Not connected"
  return `${raw.slice(0, 6)}...${raw.slice(-6)}`
})
const walletCompactNetwork = computed(() => phantomNetwork.value || walletConfigSafe.value.chain || "—")
const walletCompactBalance = computed(() =>
  phantomUsdcBalance.value === null ? "— USDC" : `${Number(phantomUsdcBalance.value).toFixed(2)} USDC`,
)
const walletMenuOpen = ref(false)
const walletDropdownRef = ref(null)
const sidebarOpen = ref(false)
const topAlertCount = computed(() => {
  const walletAlerts = walletGuardError.value ? 1 : 0
  const adminAlerts = isAdminUser.value ? disputedContracts.value.length : 0
  return walletAlerts + adminAlerts
})

function toggleWalletMenu() {
  const next = !walletMenuOpen.value
  walletMenuOpen.value = next
  if (next && !walletGuardLoading.value) refreshWalletGuard()
}

function closeWalletMenu() {
  walletMenuOpen.value = false
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}

function selectTab(tab) {
  activeTab.value = tab
  closeSidebar()
}

function openNotificationsTab() {
  activeTab.value = isAdminUser.value ? "Admin" : "Overview"
  closeSidebar()
}

function openMessagesTab() {
  activeTab.value = "Messages"
  closeSidebar()
}

function openProfileTab() {
  activeTab.value = "Profile"
  closeSidebar()
}

function handleGlobalPointerDown(event) {
  if (!walletMenuOpen.value) return
  const root = walletDropdownRef.value
  if (!root || root.contains(event.target)) return
  closeWalletMenu()
}

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

async function loadAdminDisputes() {
  if (!isAdminUser.value) return
  adminDisputesLoading.value = true
  adminDisputesError.value = ""
  try {
    const extractItems = (data) => (Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [])

    // Always fetch full admin disputes list for accurate cards (OPEN + RESOLVED).
    const allData = await listAdminDisputesApi({ page: 1, limit: 100 })
    const items = extractItems(allData)

    adminDisputeItems.value = items
    if (!adminDisputeItems.value.length) adminDisputesError.value = "Aucun litige ouvert."
  } catch (e) {
    adminDisputesError.value = e?.response?.data?.message || e?.message || "Impossible de charger les litiges."
    adminDisputeItems.value = []
  } finally {
    adminDisputesLoading.value = false
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
    let cfg = await walletConfigStore.fetchWalletConfig({ auth: true, force: true })
    if (!cfg) {
      cfg = await walletConfigStore.fetchWalletConfig({ auth: false, force: true })
    }
    if (!cfg) {
      console.warn("Wallet config vide (non bloquant pour l'affichage admin disputes).")
      return
    }
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

function openContractPreview(contract, { adminReadonly = false } = {}) {
  previewContract.value = contract
  previewAdminReadonly.value = adminReadonly
  showContractViewer.value = true
}

function closeContractPreview() {
  previewContract.value = null
  previewAdminReadonly.value = false
  showContractViewer.value = false
}

function openAdminDispute(disputeItem) {
  const contract = disputeItem?.contract
  if (!contract) return
  openContractPreview(contract, { adminReadonly: true })
}

async function handleAdminDecision({ disputeId, vote }) {
  if (!disputeId || !vote) return
  adminActionLoadingId.value = disputeId
  try {
    // Read back authoritative votes from admin endpoint.
    const detail = await getAdminDisputeApi(disputeId)
    const item = detail?.item || null
    const backendMyVote = String(item?.myVote || item?.my_vote || "").toUpperCase()
    if (backendMyVote) {
      alert(`Vote déjà enregistré (${backendMyVote}).`)
      await loadAdminDisputes()
      return
    }

    const me = String(auth.user?.uuid || auth.user?.userUuid || auth.user?.id || auth.userUuid || "").trim()
    const admin1Uuid = String(walletConfigSafe.value.admin1UserUuid || "").trim()
    const admin2Uuid = String(walletConfigSafe.value.admin2UserUuid || "").trim()
    const myCurrentVote =
      me && admin1Uuid && me === admin1Uuid
        ? String(item?.votes?.admin1 || "").toUpperCase()
        : me && admin2Uuid && me === admin2Uuid
          ? String(item?.votes?.admin2 || "").toUpperCase()
          : ""
    if (myCurrentVote) {
      alert(`Vote déjà enregistré (${myCurrentVote}).`)
      await loadAdminDisputes()
      return
    }

    await voteAndAutoResolve(disputeId, vote)
    await loadAdminDisputes()
    await loadMyContracts()
  } catch (error) {
    const status = error?.response?.status
    if (status === 403) {
      alert("403: vous n'êtes pas admin autorisé pour cette action.")
    } else if (status === 409) {
      alert("409: état du litige incompatible (votes non alignés ou déjà résolu).")
    } else {
      alert(error?.response?.data?.message || error?.message || "Action admin impossible.")
    }
  } finally {
    adminActionLoadingId.value = null
  }
}

async function voteAndAutoResolve(disputeId, vote) {
  await voteDisputeApi(disputeId, vote)

  const detailAfterVote = await getAdminDisputeApi(disputeId)
  const itemAfterVote = detailAfterVote?.item || null
  const status = String(itemAfterVote?.status || "").toUpperCase()
  const v1 = String(itemAfterVote?.votes?.admin1 || "").toUpperCase()
  const v2 = String(itemAfterVote?.votes?.admin2 || "").toUpperCase()
  const hasDisagreement = !!v1 && !!v2 && v1 !== v2

  if (status === "OPEN" && hasDisagreement) {
    await resetDisputeVotesApi(disputeId)
    return await getAdminDisputeApi(disputeId)
  }

  if (status === "OPEN" && itemAfterVote?.canResolve === true) {
    const txSig = await executeResolveTxWithWallet(disputeId)
    await resolveWithRetry(disputeId, txSig)
    return await getAdminDisputeApi(disputeId)
  }

  return detailAfterVote
}

async function executeResolveTxWithWallet(disputeId) {
  const planResp = await buildResolveTxApi(disputeId)
  const plan = planResp?.plan || null
  if (!plan) throw new Error("Plan resolve introuvable.")

  const usdcMint = String(plan?.usdcMint || "").trim()
  if (!usdcMint) throw new Error("usdcMint manquant dans le plan de resolve.")

  const feeAtaRaw = String(plan?.recipients?.bynnexFeeAta || "").trim()
  const employerWalletRaw = String(plan?.recipients?.employerWallet || "").trim()
  const freelancerWalletRaw = String(plan?.recipients?.freelancerWallet || "").trim()
  if (!feeAtaRaw || !employerWalletRaw || !freelancerWalletRaw) {
    throw new Error("Destinataires resolve incomplets.")
  }

  const toBigIntMicros = (value) => {
    const str = String(value ?? "0").trim()
    if (!str) return 0n
    return BigInt(str)
  }
  const feeAmount = toBigIntMicros(plan?.amounts?.feeDisputeMicros)
  const toEmployer = toBigIntMicros(plan?.amounts?.toEmployerMicros)
  const toFreelancer = toBigIntMicros(plan?.amounts?.toFreelancerMicros)

  const expectedWallet = String(auth.user?.walletAddress || "").trim()
  const { provider, publicKey } = await connectPhantom()
  if (!provider || !publicKey) throw new Error("Wallet Phantom non connecté.")
  const senderWallet = publicKey.toBase58()
  if (expectedWallet && senderWallet !== expectedWallet) {
    throw new Error("Wallet Phantom différent du compte connecté.")
  }

  const rpcUrl = String(walletConfigSafe.value.rpcUrl || "").trim()
  if (!rpcUrl) throw new Error("rpcUrl manquant.")
  const connection = getConnection(rpcUrl)

  const mintPk = new PublicKey(usdcMint)
  const senderPk = new PublicKey(senderWallet)
  const senderAta = await getAssociatedTokenAddress(
    mintPk,
    senderPk,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  const employerPk = new PublicKey(employerWalletRaw)
  const freelancerPk = new PublicKey(freelancerWalletRaw)
  const feeAta = new PublicKey(feeAtaRaw)
  const employerAta = await getAssociatedTokenAddress(
    mintPk,
    employerPk,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )
  const freelancerAta = await getAssociatedTokenAddress(
    mintPk,
    freelancerPk,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  const tx = new Transaction()

  const ensureAtaIxIfMissing = async (ata, owner) => {
    const info = await connection.getAccountInfo(ata)
    if (info) return
    tx.add(
      createAssociatedTokenAccountInstruction(
        senderPk,
        ata,
        owner,
        mintPk,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    )
  }

  await ensureAtaIxIfMissing(employerAta, employerPk)
  await ensureAtaIxIfMissing(freelancerAta, freelancerPk)

  if (feeAmount > 0n) {
    tx.add(
      createTransferInstruction(
        senderAta,
        feeAta,
        senderPk,
        feeAmount,
        [],
        TOKEN_PROGRAM_ID,
      ),
    )
  }
  if (toEmployer > 0n) {
    tx.add(
      createTransferInstruction(
        senderAta,
        employerAta,
        senderPk,
        toEmployer,
        [],
        TOKEN_PROGRAM_ID,
      ),
    )
  }
  if (toFreelancer > 0n) {
    tx.add(
      createTransferInstruction(
        senderAta,
        freelancerAta,
        senderPk,
        toFreelancer,
        [],
        TOKEN_PROGRAM_ID,
      ),
    )
  }
  if (tx.instructions.length === 0) {
    throw new Error("Aucun transfert à effectuer pour ce litige.")
  }

  tx.feePayer = senderPk
  const latest = await connection.getLatestBlockhash("confirmed")
  tx.recentBlockhash = latest.blockhash

  let signature = null
  if (typeof provider.signAndSendTransaction === "function") {
    const res = await provider.signAndSendTransaction(tx)
    signature = res?.signature || res
  } else if (typeof provider.sendTransaction === "function") {
    signature = await provider.sendTransaction(tx, connection)
  } else {
    throw new Error("Wallet Phantom ne supporte pas l'envoi de transaction.")
  }

  const txSig = String(signature || "").trim()
  if (!txSig) throw new Error("Signature transaction vide.")
  await connection.confirmTransaction(txSig, "confirmed")
  return txSig
}

async function resolveWithRetry(disputeId, txSig) {
  try {
    await resolveDisputeApi(disputeId, { txSig })
    return
  } catch (error) {
    const status = error?.response?.status
    const message = String(error?.response?.data?.message || error?.message || "")
    const notConfirmed = status === 409 && message.toLowerCase().includes("not confirmed")
    if (!notConfirmed) throw error
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await resolveDisputeApi(disputeId, { txSig })
  }
}

async function handleContractUpdated() {
  await loadMyContracts()
  if (isAdminUser.value) await loadAdminDisputes()
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
      adminDisputeItems.value = []
      adminDisputesError.value = ""
      activeTab.value = "Overview"
    }
  },
)

// ==========================
// MOUNT
// ==========================
onMounted(() => {
  window.addEventListener("focus", handleWindowFocus)
  window.addEventListener("mousedown", handleGlobalPointerDown)
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
  [() => activeTab.value, () => isAdminUser.value],
  ([tab, canAccessAdmin]) => {
    closeWalletMenu()
    closeSidebar()
    if (tab === "Admin" && !canAccessAdmin) {
      activeTab.value = "Overview"
      return
    }
    if (tab === "Admin" && canAccessAdmin) {
      loadAdminDisputes()
    }
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

watch(
  () => auth.isAuthenticated,
  (logged) => {
    if (!logged) {
      closeWalletMenu()
      closeSidebar()
    }
  },
)

onBeforeUnmount(() => {
  window.removeEventListener("focus", handleWindowFocus)
  window.removeEventListener("mousedown", handleGlobalPointerDown)
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
      </div>

      <button class="menu-toggle" type="button" @click="toggleSidebar" aria-label="Open navigation menu">
        ☰
      </button>

      <nav class="tabs tabs-inline">
        <button
          v-for="tab in tabs"
          :key="tab"
          :class="['tab', { active: activeTab === tab }]"
          @click="selectTab(tab)"
        >
          <span>{{ tab }}</span>
          <span v-if="tab === 'Messages' && unreadCount" class="tab-badge">
            {{ unreadCount }}
          </span>
        </button>
      </nav>

      <div class="top-actions">
        <div class="wallet-dropdown" ref="walletDropdownRef">
          <button class="wallet-mini" type="button" @click="toggleWalletMenu" :title="phantomAddress || 'Wallet not connected'">
            <span class="wallet-mini-main">
              <span class="usdc-dot">●</span>
              <span class="wallet-mini-balance">{{ walletCompactBalance }}</span>
            </span>
            <span class="wallet-caret">{{ walletMenuOpen ? "▴" : "▾" }}</span>
          </button>

          <div v-if="walletMenuOpen" class="wallet-menu">
            <div class="wallet-menu-row">
              <span>Address</span>
              <strong>{{ phantomAddress || "Not connected" }}</strong>
            </div>
            <div class="wallet-menu-row">
              <span>Network</span>
              <strong>{{ walletCompactNetwork }}</strong>
            </div>
            <div class="wallet-menu-row">
              <span>USDC</span>
              <strong>{{ walletCompactBalance }}</strong>
            </div>
            <div v-if="walletGuardError" class="wallet-menu-error">STOP: {{ walletGuardError }}</div>
            <div class="wallet-menu-actions">
              <button class="wallet-menu-btn" type="button" :disabled="walletGuardLoading" @click="refreshWalletGuard">
                {{ walletGuardLoading ? "Checking..." : "Refresh" }}
              </button>
              <button class="wallet-menu-btn logout" type="button" @click="handleLogout">Deconnexion</button>
            </div>
          </div>
        </div>
        <button
          class="icon-dot"
          type="button"
          title="Notifications"
          @click="openNotificationsTab"
        >
          <span>🔔</span>
          <span v-if="topAlertCount" class="icon-count">{{ topAlertCount }}</span>
        </button>
        <button class="icon-dot" type="button" title="Messages" @click="openMessagesTab">
          <span>✉</span>
          <span v-if="unreadCount" class="icon-count">{{ unreadCount }}</span>
        </button>
        <div
          class="profile profile-clickable"
          role="button"
          tabindex="0"
          @click="openProfileTab"
          @keydown.enter.prevent="openProfileTab"
          @keydown.space.prevent="openProfileTab"
        >
          {{ profile.username?.substring(0, 2).toUpperCase() }}
        </div>
      </div>
    </header>

    <div v-if="sidebarOpen" class="nav-drawer-backdrop" @click="closeSidebar" />
    <aside class="nav-drawer" :class="{ open: sidebarOpen }">
      <div class="nav-drawer-head">
        <div class="work-pill work-pill-drawer">
          <img :src="byhnexLogo" alt="Byhnex logo" class="work-logo" />
        </div>
        <button class="menu-close" type="button" @click="closeSidebar" aria-label="Close navigation menu">×</button>
      </div>

      <nav class="nav-drawer-tabs">
        <button
          v-for="tab in tabs"
          :key="`drawer-${tab}`"
          :class="['tab', { active: activeTab === tab }]"
          @click="selectTab(tab)"
        >
          <span>{{ tab }}</span>
          <span v-if="tab === 'Messages' && unreadCount" class="tab-badge">
            {{ unreadCount }}
          </span>
        </button>
      </nav>

      <div class="nav-drawer-actions">
        <button class="icon-dot" type="button" title="Notifications" @click="openNotificationsTab">
          <span>🔔</span>
          <span v-if="topAlertCount" class="icon-count">{{ topAlertCount }}</span>
        </button>
        <button class="icon-dot" type="button" title="Messages" @click="openMessagesTab">
          <span>✉</span>
          <span v-if="unreadCount" class="icon-count">{{ unreadCount }}</span>
        </button>
        <button class="icon-dot" type="button" title="Profile" @click="openProfileTab">👤</button>
      </div>

      <section class="nav-drawer-wallet">
        <p class="drawer-wallet-title">Wallet</p>
        <p class="drawer-wallet-value">{{ walletCompactBalance }}</p>
        <p class="drawer-wallet-meta">{{ walletCompactNetwork }} • {{ walletCompactAddress }}</p>
        <p v-if="walletGuardError" class="wallet-menu-error">STOP: {{ walletGuardError }}</p>
        <div class="wallet-menu-actions">
          <button class="wallet-menu-btn" type="button" :disabled="walletGuardLoading" @click="refreshWalletGuard">
            {{ walletGuardLoading ? "Checking..." : "Refresh" }}
          </button>
          <button class="wallet-menu-btn logout" type="button" @click="handleLogout">Deconnexion</button>
        </div>
      </section>
    </aside>
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
      :reputation="profileStore.reputation"
      :reputation-loading="profileStore.reputationLoading"
      :reputation-error="profileStore.reputationError"
      :loading="profileStore.loading"
      :saving="profileStore.saving"
      :error="profileStore.error"
      @save-profile="handleSaveProfile"
    />

    <AdminSection
      v-else-if="activeTab === 'Admin' && isAdminUser"
      :cards="adminCards"
      :disputes="adminDisputes"
      :transactions="adminTransactions"
      :action-loading-id="adminActionLoadingId"
      :current-admin-uuid="auth.user?.uuid || auth.user?.userUuid || auth.user?.id || auth.userUuid || ''"
      :admin1-user-uuid="walletConfigSafe.admin1UserUuid || ''"
      :admin2-user-uuid="walletConfigSafe.admin2UserUuid || ''"
      @open-dispute-contract="openAdminDispute"
      @decide-dispute="handleAdminDecision"
    />

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
  :admin-readonly="previewAdminReadonly"
  :program-id="walletConfigSafe.programId"
  :usdc-mint="walletConfigSafe.usdcMint"
  :rpc-url="walletConfigSafe.rpcUrl"
  :fee-wallet="walletConfigSafe.feeWallet"
  :admin1="walletConfigSafe.admin1"
  :admin2="walletConfigSafe.admin2"
  :admin1-user-uuid="walletConfigSafe.admin1UserUuid"
  :admin2-user-uuid="walletConfigSafe.admin2UserUuid"
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
  margin: 0 auto 48px;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 20px;
  padding: 20px;
  border: 1px solid rgba(96, 133, 255, 0.26);
  background:
    radial-gradient(circle at 18% 20%, rgba(125, 125, 255, 0.16), transparent 38%),
    linear-gradient(120deg, rgba(8, 16, 45, 0.94), rgba(5, 18, 52, 0.9));
  box-shadow:
    0 14px 24px rgba(0, 0, 0, 0.3),
    inset 0 0 0 1px rgba(255, 255, 255, 0.03);
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-toggle {
  display: none;
  height: 36px;
  width: 36px;
  border-radius: 10px;
  border: 1px solid rgba(120, 90, 255, 0.24);
  background: rgba(255, 255, 255, 0.04);
  color: #dce7ff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.wallet-dropdown {
  position: relative;
}

.wallet-mini {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 132px;
  height: 36px;
  border-radius: 11px;
  border: 1px solid rgba(120, 90, 255, 0.25);
  background: rgba(255, 255, 255, 0.04);
  color: #d9e5ff;
  padding: 0 10px;
  text-align: left;
  cursor: pointer;
}

.wallet-mini-main {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.usdc-dot {
  color: #dfe7ff;
  font-size: 11px;
  line-height: 1;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 30% 30%, #aab8ff, #6a48ff);
}

.wallet-caret {
  color: #8fa2ca;
  font-size: 10px;
  line-height: 1;
}

.wallet-mini-balance {
  font-size: 13px;
  font-weight: 700;
}

.wallet-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: min(320px, 85vw);
  z-index: 20;
  border-radius: 12px;
  border: 1px solid rgba(96, 133, 255, 0.34);
  background: linear-gradient(160deg, rgba(8, 15, 39, 0.98), rgba(9, 22, 52, 0.96));
  box-shadow:
    0 18px 32px rgba(0, 0, 0, 0.42),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  padding: 10px;
  display: grid;
  gap: 8px;
}

.wallet-menu-row {
  display: grid;
  gap: 2px;
}

.wallet-menu-row span {
  font-size: 11px;
  color: #8ea1c9;
}

.wallet-menu-row strong {
  font-size: 12px;
  color: #e8f0ff;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.wallet-menu-error {
  margin-top: 2px;
  padding: 7px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 107, 107, 0.45);
  background: rgba(255, 107, 107, 0.12);
  color: #ffb4b4;
  font-size: 11px;
  font-weight: 700;
}

.wallet-menu-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.wallet-menu-btn {
  height: 32px;
  border-radius: 9px;
  border: 1px solid rgba(120, 90, 255, 0.32);
  background: rgba(255, 255, 255, 0.04);
  color: #dce7ff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.wallet-menu-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.wallet-menu-btn.logout {
  border-color: rgba(255, 120, 160, 0.35);
  background: rgba(255, 120, 160, 0.12);
  color: #ffd0e1;
}

.work-pill {
  padding: 5px;
  border-radius: 25px;
  background: linear-gradient(90deg, rgba(103, 95, 255, 0.92), rgba(36, 188, 255, 0.88));
  color: #eef2ff;
  box-shadow:
    0 10px 20px rgba(0, 0, 0, 0.28),
    inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.work-logo {
  width: 50px;
  height: 50px;
  object-fit: contain;
  display: block;
}

.work-text {
  color: #eef2ff;
  font-weight: 800;
  letter-spacing: 0.05em;
  font-size: 14px;
  text-transform: uppercase;
}

.icon-dot {
  position: relative;
  height: 36px;
  width: 36px;
  border-radius: 12px;
  border: 1px solid rgba(120, 90, 255, 0.22);
  background: rgba(255, 255, 255, 0.04);
  color: #dce7ff;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.icon-count {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, #6a48ff, #00c6ff);
  color: #061227;
  font-size: 10px;
  line-height: 17px;
  font-weight: 800;
  text-align: center;
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

.nav-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(3, 8, 20, 0.6);
  backdrop-filter: blur(2px);
  z-index: 35;
}

.nav-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: min(360px, 90vw);
  height: 100vh;
  z-index: 40;
  padding: 14px;
  display: grid;
  grid-template-rows: auto auto auto 1fr;
  gap: 12px;
  background: linear-gradient(160deg, rgba(8, 15, 39, 0.98), rgba(9, 22, 52, 0.96));
  border-left: 1px solid rgba(96, 133, 255, 0.34);
  box-shadow: -18px 0 36px rgba(0, 0, 0, 0.4);
  transform: translateX(104%);
  transition: transform 0.2s ease;
  pointer-events: none;
}

.nav-drawer.open {
  transform: translateX(0);
  pointer-events: auto;
}

.nav-drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.work-pill-drawer {
  min-width: 0;
}

.menu-close {
  height: 34px;
  width: 34px;
  border-radius: 10px;
  border: 1px solid rgba(120, 90, 255, 0.24);
  background: rgba(255, 255, 255, 0.04);
  color: #dce7ff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.nav-drawer-tabs {
  display: grid;
  gap: 8px;
}

.nav-drawer-tabs .tab {
  justify-content: space-between;
}

.nav-drawer-actions {
  display: flex;
  gap: 8px;
}

.nav-drawer-wallet {
  align-self: end;
  border-radius: 12px;
  border: 1px solid rgba(96, 133, 255, 0.3);
  background: rgba(255, 255, 255, 0.03);
  padding: 10px;
  display: grid;
  gap: 6px;
}

.drawer-wallet-title {
  color: #9ab0d8;
  font-size: 12px;
}

.drawer-wallet-value {
  color: #ecf4ff;
  font-size: 16px;
  font-weight: 800;
}

.drawer-wallet-meta {
  color: #93a8d2;
  font-size: 12px;
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
  align-items: center;
  gap: 8px;
  margin: 0;
}

.tabs-inline {
 flex: 1;
  min-width: 280px;
  justify-content: space-around;
  overflow-x: auto;
  padding: 4px 2px;
  max-width: 700PX;
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

@media (max-width: 1024px) {
  .top-bar {
    justify-content: space-between;
  }

  .tabs-inline,
  .top-actions {
    display: none;
  }

  .menu-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
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
