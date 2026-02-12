import { Buffer } from "buffer"
import { PublicKey } from "@solana/web3.js"
import { toPublicKey } from "./keys"

const U64_MAX = (1n << 64n) - 1n

export const isU8Array32 = (arr) =>
  Array.isArray(arr) &&
  arr.length === 32 &&
  arr.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)

export const normalizeContractIdU64 = (value) => {
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

  return asBigInt
}

export const contractIdU64ToBuffer = (contractIdU64) => {
  let n = normalizeContractIdU64(contractIdU64)
  const out = Buffer.alloc(8)
  for (let i = 0; i < 8; i += 1) {
    out[i] = Number(n & 0xffn)
    n >>= 8n
  }
  return out
}

export const contractId32ToBuffer = (contractId32) => {
  if (!isU8Array32(contractId32)) {
    throw new Error("contractId32 doit être un Array(32) u8.")
  }
  return Buffer.from(Uint8Array.from(contractId32))
}

export const findEscrowPdas = async (programId, initializer, worker, contractIdU64) => {
  const programPk = toPublicKey(programId)
  const initializerPk = toPublicKey(initializer)
  const workerPk = toPublicKey(worker)

  const contractSeed = contractIdU64ToBuffer(contractIdU64)

  const [escrowStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), initializerPk.toBuffer(), workerPk.toBuffer(), contractSeed],
    programPk
  )

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), initializerPk.toBuffer(), workerPk.toBuffer(), contractSeed],
    programPk
  )

  return { escrowStatePda, vaultPda }
}
