// src/services/solana.js
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor"
import { Buffer } from "buffer"
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

// --------------------------------------------------
// CONFIG
// --------------------------------------------------
const DEFAULT_RPC =
  import.meta.env.VITE_SOLANA_RPC ||
  clusterApiUrl((import.meta.env.VITE_SOLANA_NETWORK || "devnet").toLowerCase())

export const DEFAULT_CHAIN =
  import.meta.env.VITE_SOLANA_CHAIN || "solana-devnet"

// --------------------------------------------------
// PHANTOM
// --------------------------------------------------
export const getPhantomProvider = () => {
  if (typeof window === "undefined") return null
  const sol = window.solana
  if (sol?.isPhantom) return sol
  if (Array.isArray(sol?.providers)) {
    return sol.providers.find((p) => p.isPhantom) || null
  }
  return null
}

export const connectPhantom = async () => {
  const provider = getPhantomProvider()
  if (!provider) throw new Error("Phantom non détecté.")
  const res = await provider.connect({ onlyIfTrusted: false })
  return { provider, publicKey: res.publicKey }
}

// --------------------------------------------------
// RPC / PROVIDER
// --------------------------------------------------
export const getConnection = (rpcUrl = DEFAULT_RPC) =>
  new Connection(rpcUrl, "confirmed")

export const getAnchorProvider = (connection, wallet) => {
  if (!wallet?.publicKey) throw new Error("Wallet requis pour Anchor.")
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" })
}

export const toPublicKey = (v) => (v instanceof PublicKey ? v : new PublicKey(v))

// --------------------------------------------------
// IDL NORMALIZATION (FIX 'reading size')
// --------------------------------------------------
/**
 * Anchor JS en browser peut planter si:
 * - accounts[].type absent
 * - instructions[].accounts uses writable/signer au lieu de isMut/isSigner
 *
 * On reconstruit un IDL "legacy-compatible".
 */
export const normalizeIdlForAnchor = (raw) => {
  const name = raw?.name ?? raw?.metadata?.name ?? "escrow_program"
  const version = raw?.version ?? raw?.metadata?.version ?? "0.1.0"

  const types = Array.isArray(raw?.types) ? raw.types : []
  const accounts = Array.isArray(raw?.accounts) ? raw.accounts : []
  const instructions = Array.isArray(raw?.instructions) ? raw.instructions : []
  const errors = Array.isArray(raw?.errors) ? raw.errors : []
  const events = Array.isArray(raw?.events) ? raw.events : []

  const typesByName = new Map(types.map((t) => [t?.name, t]))

  // ✅ accounts[].type obligatoire
  const normalizedAccounts = accounts.map((acc) => {
    if (acc?.type) return acc
    const typeDef = typesByName.get(acc?.name)
    if (typeDef?.type) return { ...acc, type: typeDef.type }
    return acc
  })

  // ✅ isMut/isSigner obligatoire
  const normalizedInstructions = instructions.map((ix) => ({
    ...ix,
    accounts: (ix.accounts || []).map((a) => ({
      ...a,
      isMut: a.isMut ?? a.writable ?? false,
      isSigner: a.isSigner ?? a.signer ?? false,
    })),
  }))

  return {
    ...raw,
    name,
    version,
    accounts: normalizedAccounts,
    instructions: normalizedInstructions,
    types,
    errors,
    events,
  }
}

/**
 * ✅ LA SEULE manière de créer Program (utilise IDL normalisé)
 * -> c'est ICI qu'on règle ton "reading 'size'".
 */
export const loadProgram = (rawIdl, programId, provider) => {
  if (!rawIdl) throw new Error("IDL manquante.")
  if (!programId) throw new Error("ProgramId manquant.")
  if (!provider) throw new Error("Provider manquant.")

  const idl = normalizeIdlForAnchor(rawIdl)
  const programPk = toPublicKey(programId)

  // debug clair
  const dbg = (idl.accounts || []).map((a) => ({
    name: a?.name,
    hasType: !!a?.type,
    kind: a?.type?.kind,
    fields: a?.type?.fields?.length,
  }))
  console.log("🧩 [loadProgram] accounts normalized =", dbg)

  const missing = dbg.filter((x) => !x.hasType)
  if (missing.length) {
    throw new Error(
      `IDL invalide: accounts sans type: ${missing.map((m) => m.name).join(", ")}`
    )
  }

  return new Program({ ...idl, address: programPk.toBase58() }, provider)
}

// --------------------------------------------------
// CONTRACT ID
// --------------------------------------------------
export const isU8Array32 = (arr) =>
  Array.isArray(arr) &&
  arr.length === 32 &&
  arr.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)

export const contractId32ToBuffer = (contractId32) => {
  if (!isU8Array32(contractId32)) {
    throw new Error("contractId32 doit être un Array(32) u8.")
  }
  return Buffer.from(Uint8Array.from(contractId32))
}

export const makeContractId32 = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
}

// --------------------------------------------------
// PDA MULTI-CONTRATS
// --------------------------------------------------
export const findEscrowPdas = async (programId, initializer, worker, contractId32) => {
  const programPk = toPublicKey(programId)
  const initializerPk = toPublicKey(initializer)
  const workerPk = toPublicKey(worker)

  const contractSeed = contractId32ToBuffer(contractId32)

  const [escrowStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), initializerPk.toBuffer(), workerPk.toBuffer(), contractSeed],
    programPk
  )

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), escrowStatePda.toBuffer()],
    programPk
  )

  return { escrowStatePda, vaultPda }
}

// --------------------------------------------------
// SPL BALANCE
// --------------------------------------------------
export const getUsdcBalance = async ({ wallet, mintAddress, connection }) => {
  const walletPk = toPublicKey(wallet)
  const mintPk = toPublicKey(mintAddress)

  const ata = await getAssociatedTokenAddress(mintPk, walletPk, false)
  const info = await getAccount(connection, ata).catch(() => null)
  if (!info) return { amount: 0, ata }

  const mintInfo = await getMint(connection, mintPk)
  const decimals = mintInfo.decimals ?? 6
  const balance = Number(info.amount) / 10 ** decimals
  return { amount: balance, ata }
}

// --------------------------------------------------
// ATA
// --------------------------------------------------
export const getOrCreateAta = async ({
  connection,
  provider,
  payer,
  owner,
  mint,
  allowOwnerOffCurve = false,
}) => {
  const payerPk = toPublicKey(payer)
  const ownerPk = toPublicKey(owner)
  const mintPk = toPublicKey(mint)

  const ata = await getAssociatedTokenAddress(
    mintPk,
    ownerPk,
    allowOwnerOffCurve,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  const info = await connection.getAccountInfo(ata).catch(() => null)
  if (info) return { ata, created: false }

  const ix = createAssociatedTokenAccountInstruction(
    payerPk,
    ata,
    ownerPk,
    mintPk,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  const tx = new Transaction().add(ix)
  const signature = await provider.sendAndConfirm(tx)
  return { ata, created: true, signature }
}

// --------------------------------------------------
// METHOD RESOLVER (snake_case vs camelCase)
// --------------------------------------------------
const resolveMethod = (program, names) => {
  const candidates = Array.isArray(names) ? names : [names]
  const methodName = candidates.find((name) => program?.methods?.[name])
  if (!methodName) {
    throw new Error(`Méthode absente de l'IDL: ${candidates.join(" / ")}`)
  }
  return program.methods[methodName].bind(program.methods)
}

// --------------------------------------------------
// INSTRUCTIONS HELPERS (exports attendus par tes modals)
// --------------------------------------------------
export const initializeEscrow = async ({
  program,
  contractId32,
  amountBaseUnitsBN,
  feeBps = 500,
  initializer,
  worker,
  admin1,
  admin2,
  escrowStatePda,
  vaultPda,
  usdcMint,
  initializerUsdcAta,
}) => {
  const method = resolveMethod(program, ["initializeEscrow", "initialize_escrow"])

  if (!isU8Array32(contractId32)) throw new Error("contractId32 invalide (Array(32) u8)")

  return method(contractId32, amountBaseUnitsBN, feeBps, toPublicKey(admin1), toPublicKey(admin2))
    .accounts({
      initializer: toPublicKey(initializer),
      worker: toPublicKey(worker),
      escrowState: toPublicKey(escrowStatePda),
      vault: toPublicKey(vaultPda),
      initializerUsdcAta: toPublicKey(initializerUsdcAta),
      usdcMint: toPublicKey(usdcMint),
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc()
}

export const acceptEscrow = async ({ program, worker, escrowStatePda }) => {
  const method = resolveMethod(program, ["workerAccept", "worker_accept"])
  return method()
    .accounts({
      worker: toPublicKey(worker),
      escrowState: toPublicKey(escrowStatePda),
    })
    .rpc()
}

export const employerApproveCompletion = async ({ program, initializer, escrowStatePda }) => {
  const method = resolveMethod(program, ["employerApproveCompletion", "employer_approve_completion"])
  return method()
    .accounts({
      initializer: toPublicKey(initializer),
      escrowState: toPublicKey(escrowStatePda),
    })
    .rpc()
}

export const workerApproveCompletion = async ({ program, worker, escrowStatePda }) => {
  const method = resolveMethod(program, ["workerApproveCompletion", "worker_approve_completion"])
  return method()
    .accounts({
      worker: toPublicKey(worker),
      escrowState: toPublicKey(escrowStatePda),
    })
    .rpc()
}

export const openDispute = async ({ program, signer, escrowStatePda }) => {
  const method = resolveMethod(program, ["openDispute", "open_dispute"])
  return method()
    .accounts({
      signer: toPublicKey(signer),
      escrowState: toPublicKey(escrowStatePda),
    })
    .rpc()
}

export const adminVote = async ({ program, admin, escrowStatePda, voteForWorker }) => {
  const method = resolveMethod(program, ["adminVote", "admin_vote"])
  return method(!!voteForWorker)
    .accounts({
      admin: toPublicKey(admin),
      escrowState: toPublicKey(escrowStatePda),
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
  const method = resolveMethod(program, ["refundToEmployer", "refund_to_employer"])
  return method()
    .accounts({
      admin: toPublicKey(admin),
      escrowState: toPublicKey(escrowStatePda),
      vault: toPublicKey(vaultPda),
      initializerUsdcAta: toPublicKey(initializerUsdcAta),
      tokenProgram: TOKEN_PROGRAM_ID,
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
  const method = resolveMethod(program, ["releaseToWorker", "release_to_worker"])
  return method()
    .accounts({
      admin: toPublicKey(admin),
      escrowState: toPublicKey(escrowStatePda),
      vault: toPublicKey(vaultPda),
      workerUsdcAta: toPublicKey(workerUsdcAta),
      adminFeeAccount: toPublicKey(adminFeeAccount),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc()
}

export const releaseIfBothApproved = async ({
  program,
  caller,
  escrowStatePda,
  vaultPda,
  workerUsdcAta,
  adminFeeAccount,
}) => {
  const method = resolveMethod(program, ["releaseIfBothApproved", "release_if_both_approved"])
  return method()
    .accounts({
      caller: toPublicKey(caller),
      escrowState: toPublicKey(escrowStatePda),
      vault: toPublicKey(vaultPda),
      workerUsdcAta: toPublicKey(workerUsdcAta),
      adminFeeAccount: toPublicKey(adminFeeAccount),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc()
}
