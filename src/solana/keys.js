import { PublicKey } from "@solana/web3.js"

export const toPublicKey = (value) => (value instanceof PublicKey ? value : new PublicKey(value))
