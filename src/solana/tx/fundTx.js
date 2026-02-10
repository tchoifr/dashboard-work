import { SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { toPublicKey } from "../keys"

const resolveMethod = (program, names) => {
  const candidates = Array.isArray(names) ? names : [names]
  const methodName = candidates.find((name) => program?.methods?.[name])
  if (!methodName) {
    throw new Error(`Méthode absente de l'IDL: ${candidates.join(" / ")}`)
  }
  return program.methods[methodName].bind(program.methods)
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
  feeWallet,
  feeUsdcAta,
}) => {
  const method = resolveMethod(program, ["initializeEscrow", "initialize_escrow"])

  if (!Array.isArray(contractId32) || contractId32.length !== 32) {
    throw new Error("contractId32 invalide (Array(32) u8)")
  }
  if (!Number.isFinite(Number(feeBps))) throw new Error("feeBps manquant.")
  if (!feeWallet) throw new Error("feeWallet manquant.")
  if (!feeUsdcAta) throw new Error("feeUsdcAta manquant.")
  if (!initializerUsdcAta) throw new Error("initializerUsdcAta manquant.")
  if (!usdcMint) throw new Error("usdcMint manquant.")

  return method(
    contractId32,
    amountBaseUnitsBN,
    feeBps,
    toPublicKey(admin1),
    toPublicKey(admin2),
  )
    .accounts({
      initializer: toPublicKey(initializer),
      worker: toPublicKey(worker),
      escrowState: toPublicKey(escrowStatePda),
      vault: toPublicKey(vaultPda),
      initializerUsdcAta: toPublicKey(initializerUsdcAta),
      feeWallet: toPublicKey(feeWallet),
      feeUsdcAta: toPublicKey(feeUsdcAta),
      usdcMint: toPublicKey(usdcMint),
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc()
}
