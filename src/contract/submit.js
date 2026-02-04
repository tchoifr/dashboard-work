import { PublicKey } from "@solana/web3.js"
import { getMint } from "@solana/spl-token"
import BN from "bn.js"

import api from "../services/api"
import rawIdl from "../idl/escrow_program.json"

import { getAnchorProvider, getConnection, getOrCreateAta, initializeEscrow, loadProgram, findEscrowPdas } from "../services/solana"
import { ensurePhantom } from "./phantom"
import { makeContractId32, ymdToIso } from "./utils"

export async function submitForm({
  props,
  canSubmit,
  form,
  loading,
  txStatus,
  usdcBalance,
  auth,
  walletAddress,
  emit,
}) {
  if (!canSubmit.value) return

  try {
    loading.value = true
    txStatus.value = "Connexion Phantom..."

    const { phantom, publicKey } = await ensurePhantom({ auth, txStatus, walletAddress })
    if (!publicKey) return alert("Wallet requis.")

    const employerUuid = auth.user?.uuid
    if (!employerUuid) return alert("Utilisateur employeur introuvable.")

    const employerWallet = publicKey.toBase58()

    const freelancerWallet = form.employer?.walletAddress || form.employer?.wallet_address
    if (!freelancerWallet) return alert("Wallet du freelance manquant.")
    const workerPk = new PublicKey(freelancerWallet)

    const startAtIso = ymdToIso(form.timeline.start, false)
    const endAtIso = ymdToIso(form.timeline.end, true)
    if (!startAtIso || !endAtIso) return alert("Please select start and end dates.")

    if (rawIdl?.address && rawIdl.address !== props.programId) {
      alert(
        "IDL et ProgramId ne correspondent pas.\n" +
          `IDL: ${rawIdl.address}\n` +
          `Program: ${props.programId}`
      )
      return
    }

    const connection = getConnection(props.rpcUrl)

    const wallet = {
      publicKey,
      signTransaction: phantom.signTransaction.bind(phantom),
      signAllTransactions: phantom.signAllTransactions.bind(phantom),
    }
    const provider = getAnchorProvider(connection, wallet)

    const program = loadProgram(rawIdl, props.programId, provider)

    const mintPk = new PublicKey(props.usdcMint)
    const mintInfo = await getMint(connection, mintPk)
    const decimals = mintInfo.decimals

    const contractId32 = makeContractId32()

    const amountUsdcUi = Number(form.amountUsdc)
    if (!Number.isFinite(amountUsdcUi) || amountUsdcUi <= 0) {
      return alert("Montant invalide")
    }

    const amountBaseUnits = new BN(Math.round(amountUsdcUi * 10 ** decimals))

    if (amountUsdcUi > usdcBalance.value) {
      return alert(`Solde insuffisant: ${usdcBalance.value} USDC dispo`)
    }

    const admin1Pk = props.admin1 ? new PublicKey(props.admin1) : publicKey
    const admin2Pk = props.admin2 ? new PublicKey(props.admin2) : publicKey

    const { escrowStatePda, vaultPda } = await findEscrowPdas(
      props.programId,
      publicKey,
      workerPk,
      contractId32
    )

    const { ata: initializerUsdcAta } = await getOrCreateAta({
      connection,
      provider,
      payer: provider.wallet.publicKey,
      owner: publicKey,
      mint: mintPk,
    })

    txStatus.value = "Signature initialize_escrow..."

    const sig = await initializeEscrow({
      program,
      contractId32,
      amountBaseUnitsBN: amountBaseUnits,
      feeBps: 500,
      initializer: publicKey,
      worker: workerPk,
      admin1: admin1Pk,
      admin2: admin2Pk,
      escrowStatePda,
      vaultPda,
      usdcMint: mintPk,
      initializerUsdcAta,
    })

    txStatus.value = "Creation du contrat..."
    console.log("✅ startAtIso/endAtIso", startAtIso, endAtIso)

    const res = await api.post("/contracts", {
      title: String(form.title || "").trim(),
      description: String(form.description || "").trim(),
      checkpoints: String(form.checkpoints || "").trim(),
      amountUsdc: String(amountUsdcUi),
      employerUuid,
      employerWallet,
      freelancerWallet: workerPk.toBase58(),
      txSig: sig,
      escrowStatePda: escrowStatePda.toBase58(),
      vaultPda: vaultPda.toBase58(),
      startAt: startAtIso,
      endAt: endAtIso,
      usdcMint: props.usdcMint,
      programId: props.programId,
      feeWallet: props.feeWallet,
      chain: props.network || "solana-devnet",
      contractId32,
    })

    txStatus.value = "Contrat cree."
    emit("created", res.data)
  } catch (err) {
    console.error("❌ Create contract error:", err)
    alert("Transaction échouée.\n👉 Regarde la console.\n" + (err?.message || ""))
  } finally {
    loading.value = false
  }
}
