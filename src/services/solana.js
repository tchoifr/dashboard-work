// src/services/solana.js
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor"
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  SYSVAR_RENT_PUBKEY,
  clusterApiUrl,
} from "@solana/web3.js"
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token"

const DEFAULT_RPC =
  import.meta.env.VITE_SOLANA_RPC ||
  clusterApiUrl((import.meta.env.VITE_SOLANA_NETWORK || "devnet").toLowerCase())

export const DEFAULT_CHAIN =
  import.meta.env.VITE_SOLANA_CHAIN || "solana-devnet"

/**
 * Récupère le provider Phantom dans la fenêtre
 */
export const getPhantomProvider = () => {
  if (typeof window === "undefined") return null
  const sol = window.solana
  if (sol?.isPhantom) return sol
  if (Array.isArray(sol?.providers)) {
    return sol.providers.find((p) => p.isPhantom) || null
  }
  return null
}

/**
 * Connecte Phantom (demande au wallet)
 */
export const connectPhantom = async () => {
  const provider = getPhantomProvider()
  if (!provider) throw new Error("Phantom non détecté.")
  const res = await provider.connect({ onlyIfTrusted: false })
  return { provider, publicKey: res.publicKey }
}

/**
 * Connexion RPC Solana
 */
export const getConnection = (rpcUrl = DEFAULT_RPC) =>
  new Connection(rpcUrl, "confirmed")

/**
 * Provider Anchor à partir d'une connexion + wallet Phantom
 */
export const getAnchorProvider = (connection, wallet) => {
  if (!wallet) throw new Error("Wallet Phantom requis pour Anchor.")
  return new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  })
}

/**
 * Charge le programme Anchor
 */
export const loadProgram = (idl, programId, provider) => {
  if (!idl) throw new Error("IDL Anchor manquante.")
  if (!programId) throw new Error("ProgramId Solana requis.")
  let programKey = programId
  try {
    if (!(programId instanceof PublicKey)) {
      programKey = new PublicKey(String(programId))
    }
  } catch (error) {
    console.error("ProgramId invalide:", programId, error)
    throw new Error("ProgramId invalide.")
  }
  return new Program(idl, programKey, provider)
}

/**
 * PDA de l'escrow + vault dérivés par le programme
 */
export const findEscrowPdas = async (programId, initializer, worker) => {
  const programPk = new PublicKey(programId)
  const [escrowStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), initializer.toBuffer(), worker.toBuffer()],
    programPk,
  )
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), escrowStatePda.toBuffer()],
    programPk,
  )
  return { escrowStatePda, vaultPda }
}

/**
 * Lit le solde USDC (ou autre SPL) pour un wallet
 */
export const getUsdcBalance = async ({
  wallet,
  mintAddress,
  connection,
}) => {
  const mint = new PublicKey(mintAddress)
  const ata = await getAssociatedTokenAddress(mint, wallet, false)
  const info = await getAccount(connection, ata).catch(() => null)
  if (!info) return { amount: 0, ata }
  const mintInfo = await getMint(connection, mint)
  const decimals = mintInfo.decimals || 6
  const balance = Number(info.amount) / 10 ** decimals
  return { amount: balance, ata }
}

const toLamports = (amount, decimals = 6) =>
  new BN(Math.floor(Number(amount) * 10 ** decimals))

const resolveMethod = (program, names) => {
  const candidates = Array.isArray(names) ? names : [names]
  const methodName = candidates.find((name) => program?.methods?.[name])
  if (!methodName) {
    throw new Error(`Méthode ${candidates.join(" / ")} absente de l'IDL.`)
  }
  return { method: program.methods[methodName], name: methodName }
}

export const getOrCreateAta = async ({
  connection,
  provider,
  payer,
  owner,
  mint,
  allowOwnerOffCurve = false,
}) => {
  const ata = await getAssociatedTokenAddress(
    mint,
    owner,
    allowOwnerOffCurve,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  const info = await connection.getAccountInfo(ata).catch(() => null)
  if (info) return { ata, created: false }

  const ix = createAssociatedTokenAccountInstruction(
    payer,
    ata,
    owner,
    mint,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )
  const tx = new Transaction().add(ix)
  const signature = await provider.sendAndConfirm(tx)
  return { ata, created: true, signature }
}

/**
 * Appel Anchor: initializeEscrow (création du state + paramètres)
 */
export const initializeEscrow = async ({
  program,
  amountUsdc,
  initializer,
  worker,
  admin1,
  admin2,
  escrowStatePda,
  vaultPda,
  usdcMint,
  initializerUsdcAta,
  feeBps = 500,
}) => {
  const { method } = resolveMethod(program, ["initializeEscrow", "initialize_escrow"])
  const decimals = 6
  const amount = toLamports(amountUsdc, decimals)
  return method(amount, feeBps, admin1, admin2)
    .accounts({
      initializer,
      worker,
      admin1,
      admin2,
      escrowState: escrowStatePda,
      vault: vaultPda,
      initializerUsdcAta,
      usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc()
}

export const acceptEscrow = async ({ program, worker, escrowStatePda }) => {
  const { method } = resolveMethod(program, ["workerAccept", "worker_accept"])
  return method()
    .accounts({
      worker,
      escrowState: escrowStatePda,
    })
    .rpc()
}

export const markDoneEmployer = async ({
  program,
  initializer,
  escrowStatePda,
}) => {
  const { method } = resolveMethod(program, [
    "employerApproveCompletion",
    "employer_approve_completion",
  ])
  return method()
    .accounts({
      initializer,
      escrowState: escrowStatePda,
    })
    .rpc()
}

export const markDoneFreelancer = async ({
  program,
  worker,
  escrowStatePda,
}) => {
  const { method } = resolveMethod(program, [
    "workerApproveCompletion",
    "worker_approve_completion",
  ])
  return method()
    .accounts({
      worker,
      escrowState: escrowStatePda,
    })
    .rpc()
}

export const releaseEscrow = async ({
  program,
  caller,
  escrowStatePda,
  vaultPda,
  workerUsdcAta,
  adminFeeAccount,
}) => {
  const { method } = resolveMethod(program, ["releaseIfBothApproved", "release_if_both_approved"])
  return method()
    .accounts({
      caller,
      escrowState: escrowStatePda,
      vault: vaultPda,
      workerUsdcAta,
      adminFeeAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc()
}

export const openDispute = async ({ program, signer, escrowStatePda }) => {
  const { method } = resolveMethod(program, ["openDispute", "open_dispute"])
  return method()
    .accounts({
      signer,
      escrowState: escrowStatePda,
    })
    .rpc()
}

export const adminVote = async ({
  program,
  admin,
  escrowStatePda,
  voteForWorker,
}) => {
  const { method } = resolveMethod(program, ["adminVote", "admin_vote"])
  return method(voteForWorker)
    .accounts({
      admin,
      escrowState: escrowStatePda,
    })
    .rpc()
}

export const releaseToWorker = async ({
  program,
  admin,
  escrowStatePda,
  vaultPda,
  workerUsdcAta,
  adminFeeAccount,
}) => {
  const { method } = resolveMethod(program, ["releaseToWorker", "release_to_worker"])
  return method()
    .accounts({
      admin,
      escrowState: escrowStatePda,
      vault: vaultPda,
      workerUsdcAta,
      adminFeeAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc()
}

export const refundToEmployer = async ({
  program,
  admin,
  escrowStatePda,
  vaultPda,
  initializerUsdcAta,
}) => {
  const { method } = resolveMethod(program, ["refundToEmployer", "refund_to_employer"])
  return method()
    .accounts({
      admin,
      escrowState: escrowStatePda,
      vault: vaultPda,
      initializerUsdcAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc()
}
