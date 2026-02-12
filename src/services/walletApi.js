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
    feeBps:
      data.feeBps ??
      data.fee_bps ??
      data.feePlatformBps ??
      data.fee_platform_bps ??
      null,
    feeVaultAta: data.feeVaultAta ?? data.fee_vault_ata ?? null,
    feeUsdcAta:
      data.feeUsdcAta ??
      data.fee_usdc_ata ??
      data.feeVaultAta ??
      data.fee_vault_ata ??
      null,
    feePlatformBps: data.feePlatformBps ?? data.fee_platform_bps ?? null,
    disputeFeeBps: data.disputeFeeBps ?? data.dispute_fee_bps ?? null,
    disputeAdminFeeEachBps:
      data.disputeAdminFeeEachBps ??
      data.dispute_admin_fee_each_bps ??
      data.disputeFeeAdminEachBps ??
      data.dispute_fee_admin_each_bps ??
      null,
    feeWallet: data.feeWallet ?? data.fee_wallet ?? null,
    admin1: data.admin1 ?? data.admin_1 ?? null,
    admin2: data.admin2 ?? data.admin_2 ?? null,
    admin1FeeAta:
      data.admin1FeeAta ??
      data.admin_1_fee_ata ??
      data.adminOneFeeAta ??
      data.admin_one_fee_ata ??
      null,
    admin2FeeAta:
      data.admin2FeeAta ??
      data.admin_2_fee_ata ??
      data.adminTwoFeeAta ??
      data.admin_two_fee_ata ??
      null,
  }
}

export const getWalletConfig = async ({ auth = false } = {}) => {
  // ✅ IMPORTANT: on passe auth:false à l'axios instance
  const { data } = await http.get("/wallet/config", { auth })
  return normalizeWalletConfig(data)
}

export { normalizeWalletConfig }
