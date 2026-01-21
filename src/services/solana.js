// src/services/solana.js
// ✅ Version complète + corrigée (devnet) + compatible navigateur
// - pas de double import PublicKey
// - Buffer polyfill explicite
// - PDA multi-contrats via contractId (hash SHA-256 -> 32 bytes)
// - logs utiles sur ATA + initializeEscrow
//
// ⚠️ IMPORTANT: pour que le multi-contrat marche VRAIMENT,
// ton programme Anchor doit aussi utiliser les mêmes seeds (avec contractId).

import { AnchorProvider, BN, Program } from "@coral-xyz/anchor"
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  SYSVAR_RENT_PUBKEY,
  clusterApiUrl,
} from "@solana/web3.js"
import { Buffer } from "buffer"
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
 * (Anchor 0.30+ : new Program(idl, provider))
 */
export const loadProgram = (idl, provider) => {
  if (!idl) throw new Error("IDL Anchor manquante.")
  if (!provider) throw new Error("Provider Anchor requis.")
  return new Program(idl, provider)
}

/**
 * Hash SHA-256 -> 32 bytes (browser-friendly)
 */
const sha256_32 = async (input) => {
  if (!input) return Buffer.alloc(32, 0)
  const data = new TextEncoder().encode(String(input))
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Buffer.from(new Uint8Array(hash)) // 32 bytes
}

/**
 * PDA de l'escrow + vault dérivés par le programme
 * ✅ Multi-contrats: contractId optionnel (seed 32 bytes)
 */
export const findEscrowPdas = async (programId, initializer, worker) => {
  const programPk = new PublicKey(programId)

  const [escrowStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), initializer.toBuffer(), worker.toBuffer()],
    programPk
  )

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), escrowStatePda.toBuffer()],
    programPk
  )

  return { escrowStatePda, vaultPda }
}

/**
 * Lit le solde SPL (USDC ou autre) pour un wallet (en UI amount)
 */
export const getUsdcBalance = async ({ wallet, mintAddress, connection }) => {
  const mint = new PublicKey(mintAddress)
  const ata = await getAssociatedTokenAddress(mint, wallet, false)
  const info = await getAccount(connection, ata).catch(() => null)
  if (!info) return { amount: 0, ata }
  const mintInfo = await getMint(connection, mint)
  const decimals = mintInfo.decimals ?? 6
  const balance = Number(info.amount) / 10 ** decimals
  return { amount: balance, ata }
}

const toLamports = (amount, decimals = 6) =>
  new BN(Math.floor(Number(amount) * 10 ** decimals))

/**
 * ✅ FIX CRITIQUE : on NE DOIT PAS détacher program.methods[xxx]
 * -> on bind pour conserver le contexte `this` attendu par Anchor.
 */
const resolveMethod = (program, names) => {
  const candidates = Array.isArray(names) ? names : [names]
  const methodName = candidates.find((name) => program?.methods?.[name])
  if (!methodName) {
    throw new Error(`Méthode ${candidates.join(" / ")} absente de l'IDL.`)
  }

  const fn = program.methods[methodName].bind(program.methods)
  return { method: fn, name: methodName }
}

/**
 * Crée l'ATA si absent.
 * payer = wallet qui signe / paye le rent
 * owner = owner du token account
 */
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
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  console.log("🔍 [getOrCreateAta]")
  console.log("payer =", payer?.toBase58?.() ?? payer)
  console.log("owner =", owner?.toBase58?.() ?? owner)
  console.log("mint  =", mint?.toBase58?.() ?? mint)
  console.log("ata   =", ata.toBase58())

  let info = null
  try {
    info = await connection.getAccountInfo(ata)
    console.log(
      "🔎 ata exists =",
      !!info,
      "lamports =",
      info?.lamports,
      "owner =",
      info?.owner?.toBase58?.()
    )
  } catch (e) {
    console.error("❌ getAccountInfo failed for ata:", ata.toBase58(), e)
    throw e
  }

  if (info) return { ata, created: false }

  const ix = createAssociatedTokenAccountInstruction(
    payer,
    ata,
    owner,
    mint,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  const tx = new Transaction().add(ix)
  const signature = await provider.sendAndConfirm(tx)
  return { ata, created: true, signature }
}

/**
 * initializeEscrow
 * ✅ amountUsdc peut être:
 * - un BN déjà en base units (recommandé)
 * - ou un nombre UI (fallback -> 6 décimales)
 *
 * ⚠️ admin1/admin2 sont passés en args de méthode (selon ton IDL)
 * Les accounts ajoutés ne le sont que si l’IDL les attend.
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
  feeWallet, // optionnel si IDL l'attend
  feeBps = 500,
}) => {
  const { method, name } = resolveMethod(program, [
    "initializeEscrow",
    "initialize_escrow",
  ])

  const amount = BN.isBN(amountUsdc) ? amountUsdc : toLamports(amountUsdc, 6)

  // Liste des accounts attendus par l’IDL
  const ix = program.idl.instructions.find((i) => i.name === name)
  const expected = (ix?.accounts || []).map((a) => a.name)

  // ✅ Anchor exige des PublicKey (pas des strings)
  const initializerPk =
    initializer instanceof PublicKey ? initializer : new PublicKey(initializer)

  const workerPk = worker instanceof PublicKey ? worker : new PublicKey(worker)

  const escrowStatePk =
    escrowStatePda instanceof PublicKey
      ? escrowStatePda
      : new PublicKey(escrowStatePda)

  const vaultPk =
    vaultPda instanceof PublicKey ? vaultPda : new PublicKey(vaultPda)

  const initializerUsdcAtaPk =
    initializerUsdcAta instanceof PublicKey
      ? initializerUsdcAta
      : new PublicKey(initializerUsdcAta)

  const usdcMintPk =
    usdcMint instanceof PublicKey ? usdcMint : new PublicKey(usdcMint)

  const admin1Pk =
    admin1 instanceof PublicKey ? admin1 : new PublicKey(admin1)

  const admin2Pk =
    admin2 instanceof PublicKey ? admin2 : new PublicKey(admin2)

  const feeWalletPk =
    feeWallet && !(feeWallet instanceof PublicKey)
      ? new PublicKey(feeWallet)
      : feeWallet

  const accounts = {
    initializer: initializerPk,
    worker: workerPk,
    escrowState: escrowStatePk,
    vault: vaultPk,
    initializerUsdcAta: initializerUsdcAtaPk,
    usdcMint: usdcMintPk,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  }

  // Ajoute seulement si l’IDL le demande
  if (expected.includes("admin1")) accounts.admin1 = admin1Pk
  if (expected.includes("admin2")) accounts.admin2 = admin2Pk
  if (expected.includes("feeWallet") && feeWalletPk) accounts.feeWallet = feeWalletPk
  if (expected.includes("associatedTokenProgram")) {
    accounts.associatedTokenProgram = ASSOCIATED_TOKEN_PROGRAM_ID
  }

  // 🔥 Dé-proxy l'objet (au cas où) -> objet "plain"
  const plainAccounts = Object.fromEntries(Object.entries(accounts))

  console.log("✅ [initializeEscrow] method =", name)
  console.log("✅ [initializeEscrow] expected accounts =", expected)
  console.log("✅ [initializeEscrow] provided accounts keys =", Object.keys(plainAccounts))
  console.log("✅ [initializeEscrow] amount baseUnits =", amount.toString(), "feeBps =", feeBps)
  console.log(
    "🧪 initializer PK =",
    plainAccounts.initializer?.toBase58?.(),
    "type =",
    plainAccounts.initializer?.constructor?.name
  )

  // Args selon ton appel actuel: (amount, feeBps, admin1, admin2)
  return method(amount, feeBps, admin1Pk, admin2Pk)
    .accounts(plainAccounts)
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

export const markDoneEmployer = async ({ program, initializer, escrowStatePda }) => {
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

export const markDoneFreelancer = async ({ program, worker, escrowStatePda }) => {
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
  const { method } = resolveMethod(program, [
    "releaseIfBothApproved",
    "release_if_both_approved",
  ])
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

export const adminVote = async ({ program, admin, escrowStatePda, voteForWorker }) => {
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
  const { method } = resolveMethod(program, [
    "releaseToWorker",
    "release_to_worker",
  ])
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
  const { method } = resolveMethod(program, [
    "refundToEmployer",
    "refund_to_employer",
  ])
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
