import { SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
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

const methodAccountNames = (program, methodName) => {
  const instructions = program?.idl?.instructions || []
  const ix = instructions.find((item) => item?.name === methodName)
  const names = (ix?.accounts || []).map((acc) => acc?.name).filter(Boolean)
  return new Set(names)
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
  const { methodName, method } = resolveMethod(program, ["initializeEscrow", "initialize_escrow"])
  const accountNames = methodAccountNames(program, methodName)
  const needsFeeWallet = accountNames.has("feeWallet") || accountNames.has("fee_wallet")
  const needsFeeUsdcAta = accountNames.has("feeUsdcAta") || accountNames.has("fee_usdc_ata")

  if (!Array.isArray(contractId32) || contractId32.length !== 32) {
    throw new Error("contractId32 invalide (Array(32) u8)")
  }
  if (!Number.isFinite(Number(feeBps))) throw new Error("feeBps manquant.")
  if (needsFeeWallet && !feeWallet) throw new Error("feeWallet manquant.")
  if (needsFeeUsdcAta && !feeUsdcAta) throw new Error("feeUsdcAta manquant.")
  if (!initializerUsdcAta) throw new Error("initializerUsdcAta manquant.")
  if (!usdcMint) throw new Error("usdcMint manquant.")

  const accounts = {
    initializer: toPublicKey(initializer),
    worker: toPublicKey(worker),
    escrowState: toPublicKey(escrowStatePda),
    vault: toPublicKey(vaultPda),
    initializerUsdcAta: toPublicKey(initializerUsdcAta),
    usdcMint: toPublicKey(usdcMint),
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  }

  if (needsFeeWallet) accounts.feeWallet = toPublicKey(feeWallet)
  if (needsFeeUsdcAta) accounts.feeUsdcAta = toPublicKey(feeUsdcAta)

  const call = method(
    contractId32,
    amountBaseUnitsBN,
    feeBps,
    toPublicKey(admin1),
    toPublicKey(admin2),
  )
    .accounts(accounts)

  try {
    return await call.rpc()
  } catch (rpcError) {
    console.error("❌ [initializeEscrow] rpc() a échoué:", rpcError?.message || rpcError)

    if (Array.isArray(rpcError?.logs) && rpcError.logs.length) {
      console.error("📜 [initializeEscrow] logs rpc:")
      for (const line of rpcError.logs) console.error("   ", line)
    }

    try {
      const sim = await call.simulate()
      const simLogs = sim?.raw?.logs || sim?.logs || []
      if (Array.isArray(simLogs) && simLogs.length) {
        console.error("🧪 [initializeEscrow] logs simulation complets:")
        for (const line of simLogs) console.error("   ", line)
      }
    } catch (simError) {
      console.error("⚠️ [initializeEscrow] impossible de simuler après échec:", simError?.message || simError)
    }

    throw rpcError
  }
}
