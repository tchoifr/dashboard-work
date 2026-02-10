// src/contract/submit.js
import { PublicKey } from "@solana/web3.js"
import { getAccount, getMint } from "@solana/spl-token"
import BN from "bn.js"

import { createContract, fundContract } from "../services/contractsApi"
import rawIdl from "../idl/escrow_program.json"

import { getAnchorProvider, getConnection } from "../solana/connection"
import { getOrCreateAta } from "../solana/usdc"
import { loadProgram } from "../solana/program"
import { findEscrowPdas } from "../solana/pdas"
import { initializeEscrow } from "../solana/tx/fundTx"
import { ensurePhantom } from "./phantom"
import { makeContractId32 } from "./utils"

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

    // 1) wallet connecté (employer/initializer)
    const { phantom, publicKey } = await ensurePhantom({ auth, txStatus, walletAddress })
    if (!publicKey) {
      alert("Wallet requis.")
      return
    }

    // 2) freelancer sélectionné (DB + wallet)
    const freelancer = form.employer

    if (!freelancer?.uuid) {
      alert(
        "Freelancer UUID (DB) manquant.\n" +
          "➡ Il faut sélectionner un utilisateur freelance (uuid en base), pas juste un wallet."
      )
      return
    }

    const freelancerWallet = freelancer.wallet_address || freelancer.walletAddress
    if (!freelancerWallet) {
      alert("Wallet du freelance manquant.")
      return
    }
    const workerPk = new PublicKey(freelancerWallet)

    if (!form.timeline?.start || !form.timeline?.end) {
      alert("Please select start and end dates.")
      return
    }

    // 3) sanity check programId vs IDL
    if (rawIdl?.address && rawIdl.address !== props.programId) {
      alert(
        "IDL et ProgramId ne correspondent pas.\n" +
          `IDL: ${rawIdl.address}\n` +
          `Program: ${props.programId}`
      )
      return
    }

    if (!props.chain) {
      alert("Chain manquante.")
      return
    }

    // 4) solana connection/provider/program
    const connection = getConnection(props.rpcUrl)

    const wallet = {
      publicKey,
      signTransaction: phantom.signTransaction.bind(phantom),
      signAllTransactions: phantom.signAllTransactions.bind(phantom),
    }
    const provider = getAnchorProvider(connection, wallet)
    const program = loadProgram(rawIdl, props.programId, provider)

    // 5) decimals/montant
    const mintPk = new PublicKey(props.usdcMint)
    const mintInfo = await getMint(connection, mintPk)
    const decimals = mintInfo.decimals ?? 6

    const amountUsdcUi = Number(form.amountUsdc)
    if (!Number.isFinite(amountUsdcUi) || amountUsdcUi <= 0) {
      alert("Montant invalide")
      return
    }

    if (amountUsdcUi > Number(usdcBalance.value || 0)) {
      alert(`Solde insuffisant: ${Number(usdcBalance.value || 0)} USDC dispo`)
      return
    }

    const amountBaseUnits = new BN(Math.round(amountUsdcUi * 10 ** decimals))

    // 6) admins (2/2)
    const admin1Pk = props.admin1 ? new PublicKey(props.admin1) : publicKey
    const admin2Pk = props.admin2 ? new PublicKey(props.admin2) : publicKey

    // 7) PDAs (escrowState + vault)
    const contractId32 = makeContractId32()
    const { escrowStatePda, vaultPda } = await findEscrowPdas(
      props.programId,
      publicKey,
      workerPk,
      contractId32
    )

    // 8) ATA source (employer)
    const { ata: initializerUsdcAta } = await getOrCreateAta({
      connection,
      provider,
      payer: provider.wallet.publicKey,
      owner: publicKey,
      mint: mintPk,
    })

    // 9) fee vault (treasury) - on utilise directement l’ATA donné par /api/wallet/config
    let feeWalletPk = props.feeWallet ? new PublicKey(props.feeWallet) : null
    let feeUsdcAta = null

    if (props.feeVaultAta) {
      feeUsdcAta = new PublicKey(props.feeVaultAta)

      // si feeWallet pas fourni (dev), on peut le déduire de l'ATA
      if (!feeWalletPk) {
        const feeAccount = await getAccount(connection, feeUsdcAta)
        feeWalletPk = feeAccount.owner
      }
    } else {
      // fallback: créer l'ATA treasury si on a seulement le wallet
      if (!feeWalletPk) {
        alert("Fee wallet (Byhnex) manquant.")
        return
      }
      const res = await getOrCreateAta({
        connection,
        provider,
        payer: provider.wallet.publicKey,
        owner: feeWalletPk,
        mint: mintPk,
      })
      feeUsdcAta = res.ata
    }

    if (!feeWalletPk || !feeUsdcAta) {
      alert("Fee vault ATA manquant.")
      return
    }

    // 10) créer le draft DB (UUID du freelancer, PAS son wallet)
    txStatus.value = "Création du draft..."

    const amountTotalUsdc = Number(amountUsdcUi).toFixed(6)

    // debug utile
    console.log("🧾 Draft payload", {
      freelancerUserUuid: freelancer.uuid,
      amountTotalUsdc,
      title: String(form.title || "").trim(),
    })

    const draft = await createContract({
      freelancerUserUuid: freelancer.uuid,
      amountTotalUsdc,
      title: String(form.title || "").trim(),
      description: String(form.description || "").trim(),
      jobId: form.jobId ?? null,
    })

    const contractUuid = draft?.contract?.uuid || draft?.uuid || draft?.contract_uuid
    if (!contractUuid) {
      throw new Error("contract_uuid manquant après création du draft")
    }

    // 11) init escrow on-chain
    txStatus.value = "Signature initialize_escrow..."

    if (!Number.isFinite(Number(props.feePlatformBps))) {
      alert("feePlatformBps manquant.")
      return
    }

    const sig = await initializeEscrow({
      program,
      contractId32,
      amountBaseUnitsBN: amountBaseUnits,
      feeBps: Number(props.feePlatformBps),
      initializer: publicKey,
      worker: workerPk,
      admin1: admin1Pk,
      admin2: admin2Pk,
      escrowStatePda,
      vaultPda,
      usdcMint: mintPk,
      initializerUsdcAta,
      feeWallet: feeWalletPk,
      feeUsdcAta,
    })

    // 12) notifier le back du funding + onchain addresses
    txStatus.value = "Envoi du funding..."

    const funded = await fundContract(contractUuid, {
      chain: props.chain,
      programId: props.programId,
      usdcMint: props.usdcMint,
      escrowStatePda: escrowStatePda.toBase58(),

      // ⚠️ dans ton back DTO: vaultAuthorityPda + escrowVaultAta
      // Ici on garde ton mapping existant (à adapter si ton programme utilise un autre PDA).
      vaultAuthorityPda: escrowStatePda.toBase58(),
      escrowVaultAta: vaultPda.toBase58(),

      feeVaultAta: props.feeVaultAta,
      disputeVaultAta: props.disputeVaultAta,
      txSig: sig,
    })

    txStatus.value = "Contrat financé."
    emit("created", funded || draft)
  } catch (err) {
    console.error("❌ Create contract error:", err)
    alert("Transaction échouée.\n👉 Regarde la console.\n" + (err?.message || ""))
  } finally {
    loading.value = false
  }
}
