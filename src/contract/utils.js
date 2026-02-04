export const normalizeIso = (date) => {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().split("T")[0]
}

export const ymdToIso = (ymd, endOfDay = false) => {
  if (!ymd) return null
  return endOfDay ? `${ymd}T23:59:59` : `${ymd}T00:00:00`
}

export function makeContractId32() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
}
