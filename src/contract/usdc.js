import { getConnection, getUsdcBalance } from "../services/solana"
import { ensurePhantom } from "./phantom"

export async function loadUsdcBalance({ props, usdcMintMissing, txStatus, usdcBalance, auth, walletAddress }) {
  try {
    if (usdcMintMissing.value) return

    txStatus.value = "Connexion Phantom..."
    const { publicKey } = await ensurePhantom({ auth, txStatus, walletAddress })
    if (!publicKey) return

    const connection = getConnection(props.rpcUrl)
    txStatus.value = "Lecture solde USDC..."

    const balanceInfo = await getUsdcBalance({
      wallet: publicKey,
      mintAddress: props.usdcMint,
      connection,
    })

    usdcBalance.value = balanceInfo.amount
    txStatus.value = ""
  } catch (e) {
    console.error("Balance Error:", e)
    txStatus.value = "Erreur solde USDC."
    usdcBalance.value = 0
  }
}
