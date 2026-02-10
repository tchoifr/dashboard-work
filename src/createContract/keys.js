import { PublicKey } from "@solana/web3.js"

export const toPublicKeyStrict = (value, label) => {
  if (!value) throw new Error(`${label} missing.`)
  return new PublicKey(value)
}
