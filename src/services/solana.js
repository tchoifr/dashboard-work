import { AnchorProvider, BN, Program } from "@coral-xyz/anchor"
import { Connection, PublicKey, SystemProgram, clusterApiUrl } from "@solana/web3.js"
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token"

const DEFAULT_RPC =
  import.meta.env.VITE_SOLANA_RPC ||
  clusterApiUrl((import.meta.env.VITE_SOLANA_NETWORK || "devnet").toLowerCase())

export const DEFAULT_CHAIN =
  import.meta.env.VITE_SOLANA_CHAIN || "solana-devnet"

export const getPhantomProvider = () => {
  if (typeof window === "undefined") return null
  const sol = window.solana
  if (sol?.isPhantom) return sol
  if (Array.isArray(sol?.providers)) {
    return sol.providers.find((p) => p.isPhantom) || null
  }
  return null
}

export const connectPhantom = async () => {
  const provider = getPhantomProvider()
  if (!provider) throw new Error("Phantom non détecté.")
  const res = await provider.connect({ onlyIfTrusted: false })
  return { provider, publicKey: res.publicKey }
}

export const getConnection = (rpcUrl = DEFAULT_RPC) =>
  new Connection(rpcUrl, "confirmed")

export const getAnchorProvider = (connection, wallet) => {
  if (!wallet) throw new Error("Wallet Phantom requis pour Anchor.")
  return new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  })
}

export const loadProgram = (idl, programId, provider) => {
  if (!idl) throw new Error("IDL Anchor manquante.")
  if (!programId) throw new Error("ProgramId Solana requis.")
  return new Program(idl, new PublicKey(programId), provider)
}

export const findEscrowPdas = async (programId, initializer, worker) => {
  const programPk = new PublicKey(programId)
  const [escrowStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), initializer.toBuffer(), worker.toBuffer()],
    programPk,
  )
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), escrowStatePda.toBuffer()],
    programPk,
  )
  return { escrowStatePda, vaultPda }
}

export const getUsdcBalance = async ({
  wallet,
  mintAddress,
  connection,
}) => {
  const mint = new PublicKey(mintAddress)
  const ata = await getAssociatedTokenAddress(mint, wallet, false)
  const info = await getAccount(connection, ata).catch(() => null)
  if (!info) return { amount: 0, ata }
  const mintInfo = await getMint(connection, mint)
  const decimals = mintInfo.decimals || 6
  const balance = Number(info.amount) / 10 ** decimals
  return { amount: balance, ata }
}

const toLamports = (amount, decimals = 6) =>
  new BN(Math.floor(Number(amount) * 10 ** decimals))

const requireMethod = (program, name) => {
  if (!program?.methods?.[name]) {
    throw new Error(`Méthode ${name} absente de l'IDL.`)
  }
}

export const initializeEscrow = async ({
  program,
  amountUsdc,
  initializer,
  worker,
  admin1,
  admin2,
  usdcMint,
  initializerUsdcAta,
  vaultPda,
  escrowStatePda,
  feeBps = 500,
}) => {
  requireMethod(program, "initializeEscrow")
  const decimals = 6
  const amount = toLamports(amountUsdc, decimals)
  return program.methods
    .initializeEscrow(amount, feeBps, admin1, admin2)
    .accounts({
      initializer,
      worker,
      admin1,
      admin2,
      escrowState: escrowStatePda,
      vault: vaultPda,
      initializerUsdcAta,
      usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc()
}

export const workerAccept = async ({ program, worker, escrowStatePda }) => {
  requireMethod(program, "workerAccept")
  return program.methods
    .workerAccept()
    .accounts({
      worker,
      escrowState: escrowStatePda,
    })
    .rpc()
}

export const openDispute = async ({ program, signer, escrowStatePda }) => {
  requireMethod(program, "openDispute")
  return program.methods
    .openDispute()
    .accounts({
      signer,
      escrowState: escrowStatePda,
    })
    .rpc()
}

export const adminVote = async ({
  program,
  admin,
  escrowStatePda,
  voteForWorker,
}) => {
  requireMethod(program, "adminVote")
  return program.methods
    .adminVote(voteForWorker)
    .accounts({
      admin,
      escrowState: escrowStatePda,
    })
    .rpc()
}

export const releaseToWorker = async ({
  program,
  admin,
  escrowStatePda,
  vaultPda,
  worker,
  workerUsdcAta,
  adminFeeAccount,
}) => {
  requireMethod(program, "releaseToWorker")
  return program.methods
    .releaseToWorker()
    .accounts({
      admin,
      escrowState: escrowStatePda,
      vault: vaultPda,
      worker,
      workerUsdcAta,
      adminFeeAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc()
}

export const refundToEmployer = async ({
  program,
  admin,
  escrowStatePda,
  vaultPda,
  initializer,
  initializerUsdcAta,
}) => {
  requireMethod(program, "refundToEmployer")
  return program.methods
    .refundToEmployer()
    .accounts({
      admin,
      escrowState: escrowStatePda,
      vault: vaultPda,
      initializer,
      initializerUsdcAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc()
}
