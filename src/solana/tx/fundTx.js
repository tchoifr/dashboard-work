import { SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, getMint } from "@solana/spl-token"
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

export const initializeEscrow = async ({
  
  program,
  contractId32,
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
console.log("initializerUsdcAta:", initializerUsdcAta)
console.log("adminFeeAccount:", adminFeeAccount)
console.log("usdcMint:", usdcMint)
console.log("escrowStatePda:", escrowStatePda.toBase58())
console.log("vaultPda:", vaultPda.toBase58())

  // -----------------------------
  // VALIDATIONS
  // -----------------------------

  if (!Array.isArray(contractId32) || contractId32.length !== 32) {
    throw new Error("contractId32 invalide (Array(32) u8)")
  }

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
    contractId32,
    amountBaseUnitsBN,
    feeBps,
    toPublicKey(admin1),
    toPublicKey(admin2),
  )
    .accounts(accounts)
    .rpc()

  return tx
}
