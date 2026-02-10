import { AnchorProvider } from "@coral-xyz/anchor"
import { Connection } from "@solana/web3.js"

export const getConnection = (rpcUrl) => {
  if (!rpcUrl) throw new Error("rpcUrl manquant.")
  return new Connection(rpcUrl, "confirmed")
}

export const getAnchorProvider = (connection, wallet) => {
  if (!wallet?.publicKey) throw new Error("Wallet requis pour Anchor.")
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" })
}
