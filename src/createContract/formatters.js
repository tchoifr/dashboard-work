import { computed } from "vue"

/** ✅ format date en anglais (UK) */
function formatDateEn(value) {
  if (!value) return "-"
  const raw = String(value).trim()

  // Important: "YYYY-MM-DD" is parsed as UTC by Date(), which can shift the day by timezone.
  // Parse it as a local calendar date to keep the exact day picked in the form.
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  const d = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(raw)

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
    const amount = pick([
      "amountUsdc",
      "amount_usdc",
      "amountTotalUsdc",
      "amount_total_usdc",
      "totalAmountUsdc",
      "total_amount_usdc",
      "usdcAmount",
      "usdc_amount",
      "amount",
      "totalUsdc",
      "total_usdc",
    ])
    if (amount == null) return "-"

    const raw = String(amount).trim()
    const normalized = raw.replace(/\s+/g, "").replace(/[^\d,.-]/g, "").replace(/,/g, ".")
    const value = Number(normalized)
    if (!Number.isFinite(value)) return "-"
    return `${value.toFixed(2)} USDC`
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
