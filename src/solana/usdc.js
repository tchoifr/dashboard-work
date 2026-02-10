import { Transaction } from "@solana/web3.js"
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token"
import { toPublicKey } from "./keys"

export const getUsdcBalance = async ({ wallet, mintAddress, connection }) => {
  const walletPk = toPublicKey(wallet)
  const mintPk = toPublicKey(mintAddress)

  const ata = await getAssociatedTokenAddress(mintPk, walletPk, false)
  const info = await getAccount(connection, ata).catch(() => null)
  if (!info) return { amount: 0, ata }

  const mintInfo = await getMint(connection, mintPk)
  const decimals = mintInfo.decimals ?? 6
  const balance = Number(info.amount) / 10 ** decimals
  return { amount: balance, ata }
}

export const getOrCreateAta = async ({
  connection,
  provider,
  payer,
  owner,
  mint,
  allowOwnerOffCurve = false,
}) => {
  const payerPk = toPublicKey(payer)
  const ownerPk = toPublicKey(owner)
  const mintPk = toPublicKey(mint)

  const ata = await getAssociatedTokenAddress(
    mintPk,
    ownerPk,
    allowOwnerOffCurve,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  const info = await connection.getAccountInfo(ata).catch(() => null)
  if (info) return { ata, created: false }

  const ix = createAssociatedTokenAccountInstruction(
    payerPk,
    ata,
    ownerPk,
    mintPk,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  const tx = new Transaction().add(ix)
  const signature = await provider.sendAndConfirm(tx)
  return { ata, created: true, signature }
}
