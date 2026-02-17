// src/services/walletApi.js
import { http } from "./http"

const normalizeWalletConfig = (data) => {
  if (!data || typeof data !== "object") return null
  const chain = data.chainSlug ?? data.chain ?? data.network ?? null
  const feeUsdcAta =
    data.adminFeeAccount ??
    data.feeUsdcAta ??
    data.fee_usdc_ata ??
    data.feeVaultAta ??
    data.fee_vault_ata ??
    null
  const admin1UsdcAta =
    data.admin1UsdcAta ??
    data.admin_1_usdc_ata ??
    data.admin1FeeAta ??
    data.admin_1_fee_ata ??
    null
  const admin2UsdcAta =
    data.admin2UsdcAta ??
    data.admin_2_usdc_ata ??
    data.admin2FeeAta ??
    data.admin_2_fee_ata ??
    null

  const admin1UserUuid =
    data.admin1UserUuid ??
    data.admin1UserUUID ??
    data.admin_1_user_uuid ??
    data.admin1_uuid ??
    data.admin_1_uuid ??
    data.ADMIN1_USER_UUID ??
    null
  const admin2UserUuid =
    data.admin2UserUuid ??
    data.admin2UserUUID ??
    data.admin_2_user_uuid ??
    data.admin2_uuid ??
    data.admin_2_uuid ??
    data.ADMIN2_USER_UUID ??
    null

  return {
    chainSlug: data.chainSlug ?? data.chain_slug ?? chain,
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
    feeVaultAta: feeUsdcAta,
    feeUsdcAta,
    feePlatformBps: data.feePlatformBps ?? data.fee_platform_bps ?? null,
    disputeFeeBps: data.disputeFeeBps ?? data.dispute_fee_bps ?? null,
    disputeAdminFeeEachBps:
      data.disputeAdminFeeEachBps ??
      data.dispute_admin_fee_each_bps ??
      data.disputeFeeAdminEachBps ??
      data.dispute_fee_admin_each_bps ??
      null,
    feeWallet: data.feeWallet ?? data.fee_wallet ?? null,
    adminFeeAccount: feeUsdcAta,
    admin1: data.admin1 ?? data.admin_1 ?? null,
    admin2: data.admin2 ?? data.admin_2 ?? null,
    admin1UserUuid,
    admin2UserUuid,
    admin1UsdcAta,
    admin2UsdcAta,
    admin1FeeAta: admin1UsdcAta,
    admin2FeeAta: admin2UsdcAta,
  }
}

export const getWalletConfig = async ({ auth = false } = {}) => {
  try {
    const { data } = await http.get("/api/web3/config", { auth })
    return normalizeWalletConfig(data)
  } catch {
    const { data } = await http.get("/wallet/config", { auth })
    return normalizeWalletConfig(data)
  }
}

export { normalizeWalletConfig }
