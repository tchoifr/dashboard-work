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

const U64_MAX = (1n << 64n) - 1n

export function parseContractIdU64(value) {
  if (value === null || value === undefined || value === "") {
    throw new Error("contractIdU64 manquant.")
  }
  const asString = typeof value === "string" ? value.trim() : String(value)
  if (!/^\d+$/.test(asString)) {
    throw new Error("contractIdU64 invalide: entier non signé attendu.")
  }
  const asBigInt = BigInt(asString)
  if (asBigInt < 0n || asBigInt > U64_MAX) {
    throw new Error("contractIdU64 hors plage u64.")
  }
  return asString
}

export function generateContractIdU64() {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  let out = 0n
  for (let i = 0; i < bytes.length; i += 1) {
    out = (out << 8n) | BigInt(bytes[i])
  }
  return out.toString(10)
}

export function hexToContractId32(hex) {
  const value = String(hex || "").trim().replace(/^0x/i, "")
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error("contractId32Hex invalide: 64 chars hex requis.")
  }
  const out = []
  for (let i = 0; i < 64; i += 2) {
    out.push(Number.parseInt(value.slice(i, i + 2), 16))
  }
  return out
}
