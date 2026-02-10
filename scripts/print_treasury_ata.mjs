import { PublicKey } from "@solana/web3.js"
import { getAssociatedTokenAddress } from "@solana/spl-token"

const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")
const TREASURY = new PublicKey("Brn2npkdBZjnhS4VSFNYbLWCBZ5n7hakVcnpNGxzXosJ")

const ata = await getAssociatedTokenAddress(USDC_MINT, TREASURY)
console.log("Treasury USDC ATA:", ata.toBase58())
