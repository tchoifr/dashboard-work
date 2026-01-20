<script setup>
import { computed, ref } from "vue"
import { PublicKey } from "@solana/web3.js"
import api from "../services/api"
import idl from "../idl/escrow_program.json"
import { useAuthStore } from "../store/auth"

import {
  acceptEscrow,
  adminVote,
  connectPhantom,
  getAnchorProvider,
  getConnection,
  getOrCreateAta,
  getPhantomProvider,
  loadProgram,
  markDoneEmployer,
  markDoneFreelancer,
  openDispute,
  refundToEmployer,
  releaseEscrow,
  releaseToWorker,
} from "../services/solana"

const props = defineProps({
  contract: {
    type: Object,
    required: true,
  },
  programId: String,
  usdcMint: String,
  rpcUrl: String,
  feeWallet: String,
  admin1: String,
  admin2: String,
})

const emit = defineEmits(["close", "updated"])
const close = () => emit("close")

const auth = useAuthStore()
const loading = ref(false)
const txStatus = ref("")

const pick = (keys) =>
  keys.map((key) => props.contract?.[key]).find((value) => value != null)

const contractId = computed(() => pick(["uuid", "id"]))
const status = computed(() => String(pick(["status"]) || "").toUpperCase())

const escrowStatePda = computed(() => pick(["escrowStatePda", "escrow_state_pda"]))
const vaultPda = computed(() => pick(["vaultPda", "vault_pda", "vault"]))

const employerWallet = computed(() => pick(["employerWallet", "employer_wallet", "employer"]))
const freelancerWallet = computed(() =>
  pick(["freelancerWallet", "freelancer_wallet", "worker_wallet", "worker"])
)

const admin1Wallet = computed(
  () => props.admin1 || pick(["adminOneWallet", "admin_one_wallet", "admin1"])
)
const admin2Wallet = computed(
  () => props.admin2 || pick(["adminTwoWallet", "admin_two_wallet", "admin2"])
)
const feeWallet = computed(() => props.feeWallet || pick(["feeWallet", "fee_wallet"]))
const programId = computed(() => props.programId || pick(["programId", "program_id"]))
const usdcMint = computed(() => props.usdcMint || pick(["usdcMint", "usdc_mint"]))

const employerDone = computed(() => Boolean(pick(["employerDone", "employer_done"])))
const freelancerDone = computed(() => Boolean(pick(["freelancerDone", "freelancer_done"])))
const admin1VoteValue = computed(() => pick(["admin1Vote", "admin1_vote"]))
const admin2VoteValue = computed(() => pick(["admin2Vote", "admin2_vote"]))

const isEmployer = computed(
  () =>
    !!auth.user?.walletAddress &&
    auth.user.walletAddress === employerWallet.value
)
const isFreelancer = computed(
  () =>
    !!auth.user?.walletAddress &&
    auth.user.walletAddress === freelancerWallet.value
)
const isAdmin = computed(() => {
  const wallet = auth.user?.walletAddress
  if (!wallet) return false
  return wallet === admin1Wallet.value || wallet === admin2Wallet.value
})

const canAccept = computed(() => isFreelancer.value && status.value === "ONCHAIN_CREATED")
const canMarkEmployer = computed(
  () =>
    isEmployer.value &&
    ["IN_PROGRESS", "DONE_PENDING"].includes(status.value) &&
    !employerDone.value
)
const canMarkFreelancer = computed(
  () =>
    isFreelancer.value &&
    ["IN_PROGRESS", "DONE_PENDING"].includes(status.value) &&
    !freelancerDone.value
)
const canRelease = computed(
  () => (isEmployer.value || isFreelancer.value) && status.value === "READY_TO_RELEASE"
)
const canDispute = computed(
  () =>
    (isEmployer.value || isFreelancer.value) &&
    ["IN_PROGRESS", "DONE_PENDING", "READY_TO_RELEASE"].includes(status.value)
)
const canAdminVote = computed(() => isAdmin.value && status.value === "DISPUTED")
const canAdminResolve = computed(
  () =>
    isAdmin.value &&
    status.value === "DISPUTED" &&
    admin1VoteValue.value &&
    admin2VoteValue.value
)

const ensurePhantom = async () => {
  const phantom = getPhantomProvider()
  if (!phantom) throw new Error("Phantom non detecte.")
  const { publicKey } = await connectPhantom()
  if (!publicKey) throw new Error("Wallet introuvable.")
  return { phantom, publicKey }
}

const getProgramContext = async (phantom) => {
  if (!programId.value) throw new Error("ProgramId manquant.")
  const connection = getConnection(props.rpcUrl)
  const provider = getAnchorProvider(connection, phantom)
  const program = loadProgram(idl, provider) // ✅ anchor 0.30+: Program(idl, provider)
  return { connection, provider, program }
}

const toPublicKey = (value, label) => {
  if (!value) throw new Error(`${label} manquant.`)
  return new PublicKey(value)
}

const notifyBackend = async (endpoint, signature) => {
  if (!contractId.value) throw new Error("Identifiant contrat manquant.")
  let didPost = false

  if (endpoint === "dispute") {
    await api.post(`/contracts/${contractId.value}/dispute`, { txSig: signature })
    didPost = true
  } else if (endpoint === "admin-vote-release") {
    await api.post(`/contracts/${contractId.value}/admin/vote-release`, { txSig: signature })
    didPost = true
  } else if (endpoint === "admin-vote-refund") {
    await api.post(`/contracts/${contractId.value}/admin/vote-refund`, { txSig: signature })
    didPost = true
  }

  if (didPost) emit("updated")
}

const withAction = async (label, action) => {
  try {
    loading.value = true
    txStatus.value = label
    await action()
    txStatus.value = "Transaction envoyee."
  } catch (error) {
    console.error(label, error)
    alert(error.message || "Transaction echouee.")
  } finally {
    loading.value = false
  }
}

const handleAccept = () =>
  withAction("Signature accept...", async () => {
    const { phantom, publicKey } = await ensurePhantom()
    const { program } = await getProgramContext(phantom)

    const signature = await acceptEscrow({
      program,
      worker: publicKey,
      escrowStatePda: toPublicKey(escrowStatePda.value, "escrow_state_pda"),
    })

    await notifyBackend("accept", signature)
  })

const handleEmployerDone = () =>
  withAction("Signature validation employeur...", async () => {
    const { phantom, publicKey } = await ensurePhantom()
    const { program } = await getProgramContext(phantom)

    const signature = await markDoneEmployer({
      program,
      initializer: publicKey,
      escrowStatePda: toPublicKey(escrowStatePda.value, "escrow_state_pda"),
    })

    await notifyBackend("employer-done", signature)
  })

const handleFreelancerDone = () =>
  withAction("Signature validation freelance...", async () => {
    const { phantom, publicKey } = await ensurePhantom()
    const { program } = await getProgramContext(phantom)

    const signature = await markDoneFreelancer({
      program,
      worker: publicKey,
      escrowStatePda: toPublicKey(escrowStatePda.value, "escrow_state_pda"),
    })

    await notifyBackend("freelancer-done", signature)
  })

const handleRelease = () =>
  withAction("Signature release...", async () => {
    const { phantom, publicKey } = await ensurePhantom()
    const { connection, provider, program } = await getProgramContext(phantom)

    const payerPk = provider.wallet.publicKey // ✅ LE payeur doit être le wallet Phantom connecté
    const mint = toPublicKey(usdcMint.value, "usdc_mint")
    const freelancerPk = toPublicKey(freelancerWallet.value, "freelancer_wallet")
    const feeWalletPk = toPublicKey(feeWallet.value, "fee_wallet")

    const { ata: freelancerAta } = await getOrCreateAta({
      connection,
      provider,
      payer: payerPk, // ✅
      owner: freelancerPk,
      mint,
    })

    const { ata: feeAta } = await getOrCreateAta({
      connection,
      provider,
      payer: payerPk, // ✅
      owner: feeWalletPk,
      mint,
    })

    const signature = await releaseEscrow({
      program,
      caller: publicKey,
      escrowStatePda: toPublicKey(escrowStatePda.value, "escrow_state_pda"),
      vaultPda: toPublicKey(vaultPda.value, "vault_pda"),
      workerUsdcAta: freelancerAta,
      adminFeeAccount: feeAta,
    })

    await notifyBackend("release", signature)
  })

const handleDispute = () =>
  withAction("Signature dispute...", async () => {
    const { phantom, publicKey } = await ensurePhantom()
    const { program } = await getProgramContext(phantom)

    const signature = await openDispute({
      program,
      signer: publicKey,
      escrowStatePda: toPublicKey(escrowStatePda.value, "escrow_state_pda"),
    })

    await notifyBackend("dispute", signature)
  })

const handleAdminVote = (decisionKey) =>
  withAction("Signature vote admin...", async () => {
    const { phantom, publicKey } = await ensurePhantom()
    const { program } = await getProgramContext(phantom)

    const signature = await adminVote({
      program,
      admin: publicKey,
      escrowStatePda: toPublicKey(escrowStatePda.value, "escrow_state_pda"),
      voteForWorker: decisionKey === "release",
    })

    await notifyBackend(
      decisionKey === "release" ? "admin-vote-release" : "admin-vote-refund",
      signature
    )
  })

const handleAdminResolveToFreelancer = () =>
  withAction("Signature resolve freelancer...", async () => {
    const { phantom, publicKey } = await ensurePhantom()
    const { connection, provider, program } = await getProgramContext(phantom)

    const payerPk = provider.wallet.publicKey // ✅
    const mint = toPublicKey(usdcMint.value, "usdc_mint")
    const freelancerPk = toPublicKey(freelancerWallet.value, "freelancer_wallet")
    const feeWalletPk = toPublicKey(feeWallet.value, "fee_wallet")

    const { ata: freelancerAta } = await getOrCreateAta({
      connection,
      provider,
      payer: payerPk, // ✅
      owner: freelancerPk,
      mint,
    })

    const { ata: feeAta } = await getOrCreateAta({
      connection,
      provider,
      payer: payerPk, // ✅
      owner: feeWalletPk,
      mint,
    })

    const signature = await releaseToWorker({
      program,
      admin: publicKey,
      escrowStatePda: toPublicKey(escrowStatePda.value, "escrow_state_pda"),
      vaultPda: toPublicKey(vaultPda.value, "vault_pda"),
      workerUsdcAta: freelancerAta,
      adminFeeAccount: feeAta,
    })

    await notifyBackend("admin-resolve", signature)
  })

const handleAdminResolveToEmployer = () =>
  withAction("Signature resolve employer...", async () => {
    const { phantom, publicKey } = await ensurePhantom()
    const { connection, provider, program } = await getProgramContext(phantom)

    const payerPk = provider.wallet.publicKey // ✅
    const mint = toPublicKey(usdcMint.value, "usdc_mint")
    const employerPk = toPublicKey(employerWallet.value, "employer_wallet")

    const { ata: employerAta } = await getOrCreateAta({
      connection,
      provider,
      payer: payerPk, // ✅
      owner: employerPk,
      mint,
    })

    const signature = await refundToEmployer({
      program,
      admin: publicKey,
      escrowStatePda: toPublicKey(escrowStatePda.value, "escrow_state_pda"),
      vaultPda: toPublicKey(vaultPda.value, "vault_pda"),
      initializerUsdcAta: employerAta,
    })

    await notifyBackend("admin-resolve", signature)
  })

const humanAmount = computed(() => {
  const amount = pick(["amountUsdc", "amount_usdc", "amount"])
  if (amount == null) return "-"
  return `${Number(amount).toFixed(2)} USDC`
})

const periodLabel = computed(() => {
  const start = pick(["startAt", "start_at"]) || props.contract?.timeline?.start
  const end = pick(["endAt", "end_at"]) || props.contract?.timeline?.end
  if (!start && !end) return "-"
  return `${start || "?"} -> ${end || "?"}`
})

const checkpointsLabel = computed(() => {
  const checkpoints = pick(["checkpoints"])
  if (Array.isArray(checkpoints)) return checkpoints.filter(Boolean).join("\n")
  return checkpoints || "No checkpoints provided."
})
</script>


<template>
  <div class="modal">
    <header class="modal-head">
      <div>
        <p class="eyebrow">Contract Preview</p>
        <h3>{{ contract.title || contract.name }}</h3>
        <p class="muted">{{ contract.client || contract.employerLabel || " " }}</p>
      </div>
      <button class="close" type="button" @click="close">x</button>
    </header>

    <div class="grid">
      <article class="info">
        <p class="label">Amount</p>
        <p class="value">{{ humanAmount }}</p>
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
        <p class="body">{{ checkpointsLabel }}</p>
      </article>
    </div>

    <section class="actions">
      <p class="label">Actions</p>
      <div class="actions-grid">
        <button
          class="btn primary"
          type="button"
          :disabled="!canAccept || loading"
          @click="handleAccept"
        >
          Accept (freelancer)
        </button>
        <button
          class="btn ghost"
          type="button"
          :disabled="!canMarkEmployer || loading"
          @click="handleEmployerDone"
        >
          Mark done (employer)
        </button>
        <button
          class="btn ghost"
          type="button"
          :disabled="!canMarkFreelancer || loading"
          @click="handleFreelancerDone"
        >
          Mark done (freelancer)
        </button>
        <button
          class="btn primary"
          type="button"
          :disabled="!canRelease || loading"
          @click="handleRelease"
        >
          Release
        </button>
        <button
          class="btn warn"
          type="button"
          :disabled="!canDispute || loading"
          @click="handleDispute"
        >
          Open dispute
        </button>
        <button
          class="btn admin"
          type="button"
          :disabled="!canAdminVote || loading"
          @click="handleAdminVote('release')"
        >
          Admin vote: release
        </button>
        <button
          class="btn admin"
          type="button"
          :disabled="!canAdminVote || loading"
          @click="handleAdminVote('refund')"
        >
          Admin vote: refund
        </button>
        <button
          class="btn admin"
          type="button"
          :disabled="!canAdminResolve || loading"
          @click="handleAdminResolveToFreelancer"
        >
          Admin resolve: freelancer
        </button>
        <button
          class="btn admin"
          type="button"
          :disabled="!canAdminResolve || loading"
          @click="handleAdminResolveToEmployer"
        >
          Admin resolve: employer
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
