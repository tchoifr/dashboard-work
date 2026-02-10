import { ensurePhantomMatchesWallet, getPhantomProvider } from "../solana/phantom"

export const ensurePhantom = async (auth) => {
  const phantom = getPhantomProvider()
  if (!phantom) throw new Error("Phantom not detected.")
  const { publicKey } = await ensurePhantomMatchesWallet(auth.user?.walletAddress || "")
  if (!publicKey) throw new Error("Wallet not found.")
  return { phantom, publicKey }
}
