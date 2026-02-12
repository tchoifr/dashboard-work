// Compatibility facade: keep old import path working with explicit modules.
export { WALLET_ERROR_CODES, getPhantomProvider, connectPhantom } from "../solana/phantom"
export { getConnection, getAnchorProvider } from "../solana/connection"
export { toPublicKey } from "../solana/keys"
export { loadProgram } from "../solana/program"
export {
  isU8Array32,
  contractId32ToBuffer,
  normalizeContractIdU64,
  contractIdU64ToBuffer,
  findEscrowPdas,
} from "../solana/pdas"
export { getUsdcBalance, getOrCreateAta } from "../solana/usdc"
export { initializeEscrow } from "../solana/tx/fundTx"
