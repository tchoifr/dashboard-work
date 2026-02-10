import rawIdl from "../idl/escrow_program.json"

import { getAnchorProvider, getConnection } from "../solana/connection"
import { loadProgram } from "../solana/program"

export const getProgramContext = async ({ rpcUrl, programId }, { phantom, publicKey }) => {
  if (!programId) throw new Error("Missing programId.")
  const connection = getConnection(rpcUrl)
  const wallet = {
    publicKey,
    signTransaction: phantom.signTransaction.bind(phantom),
    signAllTransactions: phantom.signAllTransactions.bind(phantom),
  }
  const provider = getAnchorProvider(connection, wallet)
  const program = loadProgram(rawIdl, programId, provider)
  return { program }
}
