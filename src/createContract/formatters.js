import { computed } from "vue"

/** ✅ format date en anglais (UK) */
function formatDateEn(value) {
  if (!value) return "-"
  const d = new Date(value) // ISO DATE_ATOM -> OK
  if (Number.isNaN(d.getTime())) return "-"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d)
}

export function useContractPreviewLabels({ pick, startAt, endAt, createdAt }) {
  const createdAtLabel = computed(() => formatDateEn(createdAt.value))

  const periodLabel = computed(() => {
    const s = formatDateEn(startAt.value)
    const e = formatDateEn(endAt.value)
    if (s === "-" && e === "-") return "-"
    return `${s} → ${e}`
  })

  const humanAmount = computed(() => {
    const amount = pick(["amountUsdc", "amount_usdc", "amount"])
    if (amount == null) return "-"
    return `${Number(amount).toFixed(2)} USDC`
  })

  const checkpointsLabel = computed(() => {
    const checkpoints = pick(["checkpoints"])
    if (Array.isArray(checkpoints)) return checkpoints.filter(Boolean).join("\n")
    return checkpoints || "No checkpoints provided."
  })

  return {
    createdAtLabel,
    periodLabel,
    humanAmount,
    checkpointsLabel,
  }
}
