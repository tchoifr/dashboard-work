import { computed } from "vue"

export function useContractPreviewSelectors(props) {
  const pick = (keys) => keys.map((k) => props.contract?.[k]).find((v) => v != null)

  /** ✅ contract uuid (ton controller utilise {uuid}) */
  const contractUuid = computed(() => pick(["uuid"]))

  /** status en majuscule */
  const status = computed(() => String(pick(["status"]) || "").toUpperCase())

  /** PDAs */
  const escrowStatePda = computed(() => pick(["escrowStatePda", "escrow_state_pda"]))

  /** wallets (ton serializer renvoie employer/freelancer objects) */
  const employerWallet = computed(() => props.contract?.employer?.walletAddress || pick(["employerWallet", "employer_wallet"]))
  const freelancerWallet = computed(() => props.contract?.freelancer?.walletAddress || pick(["freelancerWallet", "freelancer_wallet"]))

  const admin1Wallet = computed(() => props.admin1 || pick(["adminOneWallet", "admin_one_wallet", "admin1"]))
  const admin2Wallet = computed(() => props.admin2 || pick(["adminTwoWallet", "admin_two_wallet", "admin2"]))
  const programId = computed(() => props.programId || pick(["programId", "program_id"]))

  /** dates ISO renvoyées par ton serializer */
  const startAt = computed(() => pick(["startAt", "start_at"]))
  const endAt = computed(() => pick(["endAt", "end_at"]))
  const createdAt = computed(() => pick(["createdAt", "created_at"]))

  return {
    pick,
    contractUuid,
    status,
    escrowStatePda,
    employerWallet,
    freelancerWallet,
    admin1Wallet,
    admin2Wallet,
    programId,
    startAt,
    endAt,
    createdAt,
  }
}
