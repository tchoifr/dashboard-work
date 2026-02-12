import { SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, getMint } from "@solana/spl-token"
import BN from "bn.js"
import { toPublicKey } from "../keys"

const resolveMethod = (program, names) => {
  const candidates = Array.isArray(names) ? names : [names]
  const methodName = candidates.find((name) => program?.methods?.[name])
  if (!methodName) {
    throw new Error(`Méthode absente de l'IDL: ${candidates.join(" / ")}`)
  }
  return {
    methodName,
    method: program.methods[methodName].bind(program.methods),
  }
}

const U64_MAX = (1n << 64n) - 1n

const normalizeU64Bn = (value) => {
  if (BN.isBN(value)) return value

  if (value === null || value === undefined || value === "") {
    throw new Error("contractIdU64 manquant.")
  }

  const asString = typeof value === "string" ? value.trim() : String(value)
  if (!/^\d+$/.test(asString)) {
    throw new Error("contractIdU64 invalide: entier non signé attendu.")
  }
  const asBigInt = BigInt(asString)
  if (asBigInt < 0n || asBigInt > U64_MAX) {
    throw new Error("contractIdU64 hors plage u64.")
  }
  return new BN(asString, 10)
}

export const initializeEscrow = async ({
  
  program,
  contractIdU64,
  amountBaseUnitsBN,
  feeBps,
  initializer,
  worker,
  admin1,
  admin2,
  escrowStatePda,
  vaultPda,
  usdcMint,
  initializerUsdcAta,
  adminFeeAccount, // = BYNNEX_FEE_VAULT_ATA
}) => {
  const { method } = resolveMethod(program, [
    "initializeEscrow",
    "initialize_escrow",
  ])

  // -----------------------------
  // VALIDATIONS
  // -----------------------------

  const contractIdArg = normalizeU64Bn(contractIdU64)

  if (!amountBaseUnitsBN) {
    throw new Error("amountBaseUnitsBN manquant.")
  }

  if (!Number.isFinite(Number(feeBps))) {
    throw new Error("feeBps manquant.")
  }

  if (!initializerUsdcAta) {
    throw new Error("initializerUsdcAta manquant.")
  }

  if (!usdcMint) {
    throw new Error("usdcMint manquant.")
  }

  if (!adminFeeAccount) {
    throw new Error(
      "adminFeeAccount manquant (BYNNEX_FEE_VAULT_ATA du backend)."
    )
  }

  const connection = program?.provider?.connection
  if (!connection) {
    throw new Error("Connection Solana introuvable.")
  }

  // -----------------------------
  // ACCOUNTS (camelCase ONLY)
  // -----------------------------

  const accounts = {
    initializer: toPublicKey(initializer),
    worker: toPublicKey(worker),

    escrowState: toPublicKey(escrowStatePda),
    vault: toPublicKey(vaultPda),

    initializerUsdcAta: toPublicKey(initializerUsdcAta),
    adminFeeAccount: toPublicKey(adminFeeAccount),

    usdcMint: toPublicKey(usdcMint),

    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  }

  // -----------------------------
  // SECURITE : Vérifie que le mint est valide
  // -----------------------------

  await getMint(connection, accounts.usdcMint)

  // -----------------------------
  // CALL PROGRAM
  // -----------------------------

  const tx = await method(
    contractIdArg,
    amountBaseUnitsBN,
    feeBps,
    toPublicKey(admin1),
    toPublicKey(admin2),
  )
    .accounts(accounts)
    .rpc()

  return tx
}
