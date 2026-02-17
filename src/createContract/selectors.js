import { computed } from "vue"

export function useContractPreviewSelectors(props) {
  const pick = (keys) => {
    const contract = props.contract || {}
    const onchain = contract.onchain || {}
    return keys
      .map((k) => contract?.[k] ?? onchain?.[k])
      .find((v) => v != null)
  }

  /** ✅ contract uuid (ton controller utilise {uuid}) */
  const contractUuid = computed(() => pick(["uuid"]))

  /** status en majuscule */
  const status = computed(() => String(pick(["status"]) || "").toUpperCase())

  /** PDAs */
  const escrowStatePda = computed(() =>
    pick(["escrowStatePda", "escrow_state_pda"])
  )

  /** wallets (ton serializer renvoie employer/freelancer objects) */
  const employerWallet = computed(
    () =>
      props.contract?.employer?.walletAddress ||
      props.contract?.employer?.wallet_address ||
      pick(["employerWallet", "employer_wallet", "initializerWallet", "initializer_wallet"])
  )
  const freelancerWallet = computed(
    () =>
      props.contract?.freelancer?.walletAddress ||
      props.contract?.freelancer?.wallet_address ||
      pick(["freelancerWallet", "freelancer_wallet", "workerWallet", "worker_wallet"])
  )

  const admin1Wallet = computed(() =>
    props.admin1 || pick(["adminOneWallet", "admin_one_wallet", "admin1"])
  )
  const admin2Wallet = computed(() =>
    props.admin2 || pick(["adminTwoWallet", "admin_two_wallet", "admin2"])
  )
  const programId = computed(() => props.programId || pick(["programId", "program_id"]))

  /** dates ISO renvoyées par ton serializer */
  const startAt = computed(() =>
    pick([
      "startAt",
      "start_at",
      "startDate",
      "start_date",
      "startsAt",
      "starts_at",
      "periodStart",
      "period_start",
      "createdAt",
      "created_at",
    ]) ||
    props.contract?.period?.start ||
    props.contract?.period?.startAt ||
    props.contract?.timeline?.start
  )
  const endAt = computed(() =>
    pick([
      "findPeriodAt",
      "find_period_at",
      "endAt",
      "end_at",
      "endDate",
      "end_date",
      "endsAt",
      "ends_at",
      "periodEnd",
      "period_end",
    ]) ||
    props.contract?.period?.end ||
    props.contract?.period?.endAt ||
    props.contract?.timeline?.end
  )
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
