import { getPhantomProvider, ensurePhantomMatchesWallet } from "../solana/phantom"

export async function ensurePhantom({ auth, txStatus, walletAddress }) {
  const phantom = getPhantomProvider()
  if (!phantom) {
    txStatus.value = "Installe Phantom."
    throw new Error("Phantom manquant")
  }

  const expectedWallet = auth.user?.walletAddress || ""
  const { publicKey, connectedWallet } = await ensurePhantomMatchesWallet(expectedWallet)
  if (expectedWallet && connectedWallet && expectedWallet !== connectedWallet) {
    txStatus.value = "STOP: wallet Phantom ≠ wallet du compte."
    throw new Error("Wallet Phantom différent du compte connecté.")
  }

  walletAddress.value = connectedWallet
  return { phantom, publicKey }
}
