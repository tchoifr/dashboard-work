import { getPhantomProvider, connectPhantom } from "../services/solana"

export async function ensurePhantom({ auth, txStatus, walletAddress }) {
  const phantom = getPhantomProvider()
  if (!phantom) {
    txStatus.value = "Installe Phantom."
    throw new Error("Phantom manquant")
  }

  const { publicKey } = await connectPhantom()
  const expectedWallet = auth.user?.walletAddress
  const connectedWallet = publicKey?.toBase58() || ""

  if (expectedWallet && connectedWallet && expectedWallet !== connectedWallet) {
    txStatus.value = "STOP: wallet Phantom ≠ wallet du compte."
    throw new Error("Wallet Phantom différent du compte connecté.")
  }

  walletAddress.value = connectedWallet
  return { phantom, publicKey }
}
