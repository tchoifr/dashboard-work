// src/services/walletApi.js
import { http } from "./http"

const normalizeWalletConfig = (data) => {
  if (!data || typeof data !== "object") return null
  const chain = data.chain ?? data.network ?? null

  return {
    chain,
    rpcUrl: data.rpcUrl ?? data.rpc_url ?? null,
    programId: data.programId ?? data.program_id ?? null,
    usdcMint: data.usdcMint ?? data.usdc_mint ?? null,
    feeVaultAta: data.feeVaultAta ?? data.fee_vault_ata ?? null,
    disputeVaultAta: data.disputeVaultAta ?? data.dispute_vault_ata ?? null,
    feePlatformBps: data.feePlatformBps ?? data.fee_platform_bps ?? null,
    disputeFeeBps: data.disputeFeeBps ?? data.dispute_fee_bps ?? null,
    feeWallet: data.feeWallet ?? data.fee_wallet ?? null,
    admin1: data.admin1 ?? data.admin_1 ?? null,
    admin2: data.admin2 ?? data.admin_2 ?? null,
  }
}

export const getWalletConfig = async ({ auth = false } = {}) => {
  // ✅ IMPORTANT: on passe auth:false à l'axios instance
  const { data } = await http.get("/wallet/config", { auth })
  return normalizeWalletConfig(data)
}

export { normalizeWalletConfig }
