import { computed, reactive, ref } from "vue"
import { useAuthStore } from "../store/auth"

export function useContractCreationState(props) {
  const auth = useAuthStore()

  const form = reactive({
    title: "",
    description: "",
    checkpoints: "",
    timeline: { start: "", end: "" },
    employer: null,
    amountUsdc: "",
  })

  const loading = ref(false)
  const txStatus = ref("")
  const usdcBalance = ref(0)
  const walletAddress = ref("")

  const usdcMintMissing = computed(() => !props.usdcMint)
  const programIdMissing = computed(() => !props.programId)

  const canSubmit = computed(() => {
    const amount = Number(form.amountUsdc)
    return (
      form.title &&
      form.description &&
      form.checkpoints &&
      form.employer &&
      form.timeline.start &&
      form.timeline.end &&
      Number.isFinite(amount) &&
      amount > 0 &&
      !loading.value &&
      !usdcMintMissing.value &&
      !programIdMissing.value
    )
  })

  return {
    auth,
    form,
    loading,
    txStatus,
    usdcBalance,
    walletAddress,
    usdcMintMissing,
    programIdMissing,
    canSubmit,
  }
}
