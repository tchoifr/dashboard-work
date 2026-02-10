import { Buffer } from "buffer"
import { PublicKey } from "@solana/web3.js"
import { toPublicKey } from "./keys"

export const isU8Array32 = (arr) =>
  Array.isArray(arr) &&
  arr.length === 32 &&
  arr.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)

export const contractId32ToBuffer = (contractId32) => {
  if (!isU8Array32(contractId32)) {
    throw new Error("contractId32 doit être un Array(32) u8.")
  }
  return Buffer.from(Uint8Array.from(contractId32))
}

export const findEscrowPdas = async (programId, initializer, worker, contractId32) => {
  const programPk = toPublicKey(programId)
  const initializerPk = toPublicKey(initializer)
  const workerPk = toPublicKey(worker)

  const contractSeed = contractId32ToBuffer(contractId32)

  const [escrowStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), initializerPk.toBuffer(), workerPk.toBuffer(), contractSeed],
    programPk
  )

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), escrowStatePda.toBuffer()],
    programPk
  )

  return { escrowStatePda, vaultPda }
}
