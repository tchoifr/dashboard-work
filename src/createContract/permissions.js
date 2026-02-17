import { computed } from "vue"

export function useContractPreviewPermissions({
  auth,
  employerWallet,
  freelancerWallet,
  admin1Wallet,
  admin2Wallet,
  admin1UserUuid,
  admin2UserUuid,
  status,
}) {
  const normalizeComparable = (value) => String(value || "").trim().toLowerCase()
  const isEmployer = computed(() => !!auth.user?.walletAddress && auth.user.walletAddress === employerWallet.value)
  const isFreelancer = computed(() => !!auth.user?.walletAddress && auth.user.walletAddress === freelancerWallet.value)
  const isAdmin = computed(() => {
    const user = auth.user || {}
    const w = user?.walletAddress || user?.wallet_address || null
    const userUuid = user?.uuid || user?.userUuid || user?.id || auth.userUuid || null
    const userIsAdmin = Boolean(user?.is_admin ?? user?.isAdmin)
    if (userIsAdmin) return true

    const isAdminByUuid =
      !!normalizeComparable(userUuid) &&
      [
        normalizeComparable(admin1UserUuid?.value),
        normalizeComparable(admin2UserUuid?.value),
      ].includes(normalizeComparable(userUuid))
    if (isAdminByUuid) return true

    if (!normalizeComparable(w)) return false
    return [
      normalizeComparable(admin1Wallet.value),
      normalizeComparable(admin2Wallet.value),
    ].includes(normalizeComparable(w))
  })

  /** règles */
  const canDispute = computed(() =>
    (isEmployer.value || isFreelancer.value) &&
    status.value === "FUNDED_ACTIVE"
  )

  return {
    isEmployer,
    isFreelancer,
    isAdmin,
    canDispute,
  }
}
