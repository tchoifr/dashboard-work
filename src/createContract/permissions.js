import { computed } from "vue"

export function useContractPreviewPermissions({
  auth,
  employerWallet,
  freelancerWallet,
  admin1Wallet,
  admin2Wallet,
  status,
}) {
  const isEmployer = computed(() => !!auth.user?.walletAddress && auth.user.walletAddress === employerWallet.value)
  const isFreelancer = computed(() => !!auth.user?.walletAddress && auth.user.walletAddress === freelancerWallet.value)
  const isAdmin = computed(() => {
    const w = auth.user?.walletAddress
    if (!w) return false
    return w === admin1Wallet.value || w === admin2Wallet.value
  })

  /** règles */
  const canDispute = computed(() =>
    (isEmployer.value || isFreelancer.value) &&
    ["IN_PROGRESS", "DONE_PENDING", "READY_TO_RELEASE"].includes(status.value)
  )

  return {
    isEmployer,
    isFreelancer,
    isAdmin,
    canDispute,
  }
}
