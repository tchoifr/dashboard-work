// src/contract/submit.js
import { PublicKey } from "@solana/web3.js";
import { getAccount, getMint } from "@solana/spl-token";
import BN from "bn.js";

import { createContract, fundContract } from "../services/contractsApi";
import rawIdl from "../idl/escrow_program.json";

import { getAnchorProvider, getConnection } from "../solana/connection";
import { getOrCreateAta } from "../solana/usdc";
import { loadProgram } from "../solana/program";
import { findEscrowPdas } from "../solana/pdas";
import { initializeEscrow } from "../solana/tx/fundTx";
import { ensurePhantom } from "./phantom";
import { makeContractId32 } from "./utils";

const DEVNET_MAINNET_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function requireValidContractId32(contractId32) {
  if (!Array.isArray(contractId32) || contractId32.length !== 32) {
    throw new Error("contract_id invalide: 32 bytes requis.");
  }
  const isByte = contractId32.every(
    (value) => Number.isInteger(value) && value >= 0 && value <= 255,
  );
  if (!isByte) {
    throw new Error("contract_id invalide: doit être un tableau d'octets.");
  }
}

function validateClusterConfig({ chain, rpcUrl, usdcMint }) {
  const chainLower = String(chain || "").toLowerCase();
  const rpcLower = String(rpcUrl || "").toLowerCase();

  if (chainLower.includes("devnet")) {
    if (!rpcLower.includes("devnet")) {
      throw new Error("Incohérence cluster: chain=devnet mais rpcUrl n'est pas devnet.");
    }
    if (String(usdcMint || "") === DEVNET_MAINNET_USDC_MINT) {
      throw new Error("Incohérence mint: mint USDC mainnet utilisé alors que chain=devnet.");
    }
  }
}

function logTxFailure(err) {
  console.error("❌ Create contract error:", err);
  console.error("   - message:", err?.message);
  console.error("   - code:", err?.code);
  console.error("   - tx signature:", err?.signature || err?.txSig || null);

  const logs =
    err?.logs ||
    err?.transactionLogs ||
    err?.errorLogs ||
    err?.simulationResponse?.value?.logs ||
    null;

  if (Array.isArray(logs) && logs.length) {
    console.error("   - logs complets:");
    for (const line of logs) console.error("    ", line);
  }

  const innerLogs = err?.error?.logs;
  if (Array.isArray(innerLogs) && innerLogs.length) {
    console.error("   - logs internes:");
    for (const line of innerLogs) console.error("    ", line);
  }
}

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
  if (!canSubmit.value) return;

  try {
    loading.value = true;
    txStatus.value = "Connexion Phantom...";

    // 1) wallet connecté (employer/initializer)
    const { phantom, publicKey } = await ensurePhantom({
      auth,
      txStatus,
      walletAddress,
    });
    if (!publicKey) {
      alert("Wallet requis.");
      return;
    }

    // 2) freelancer sélectionné (DB + wallet)
    const freelancer = form.employer;
    if (!freelancer) {
      alert("Sélectionne un freelance avant de créer le contrat.");
      return;
    }

    const freelancerUuid = freelancer.uuid;
    if (!freelancerUuid) {
      alert("Le freelance sélectionné est invalide (UUID manquant).");
      return;
    }

    const freelancerWallet = freelancer.walletAddress;
    if (!freelancerWallet) {
      alert("Le freelance sélectionné est invalide (wallet manquant).");
      return;
    }
    const workerPk = new PublicKey(freelancerWallet);

    if (!form.timeline?.start || !form.timeline?.end) {
      alert("Please select start and end dates.");
      return;
    }

    // 3) sanity check programId vs IDL
    if (rawIdl?.address && rawIdl.address !== props.programId) {
      alert(
        "IDL et ProgramId ne correspondent pas.\n" +
          `IDL: ${rawIdl.address}\n` +
          `Program: ${props.programId}`,
      );
      return;
    }

    if (!props.chain) {
      alert("Chain manquante.");
      return;
    }
    validateClusterConfig({
      chain: props.chain,
      rpcUrl: props.rpcUrl,
      usdcMint: props.usdcMint,
    });

    // 4) solana connection/provider/program
    const connection = getConnection(props.rpcUrl);

    const wallet = {
      publicKey,
      signTransaction: phantom.signTransaction.bind(phantom),
      signAllTransactions: phantom.signAllTransactions.bind(phantom),
    };
    const provider = getAnchorProvider(connection, wallet);
    const program = loadProgram(rawIdl, props.programId, provider);

    // 5) decimals/montant
    const mintPk = new PublicKey(props.usdcMint);
    const mintInfo = await getMint(connection, mintPk);
    const decimals = mintInfo.decimals ?? 6;

    const amountUsdcUi = Number(form.amountUsdc);
    if (!Number.isFinite(amountUsdcUi) || amountUsdcUi <= 0) {
      alert("Montant invalide");
      return;
    }

    if (amountUsdcUi > Number(usdcBalance.value || 0)) {
      alert(`Solde insuffisant: ${Number(usdcBalance.value || 0)} USDC dispo`);
      return;
    }

    const amountBaseUnits = new BN(Math.round(amountUsdcUi * 10 ** decimals));
    const amountBaseUnitsBigInt = BigInt(amountBaseUnits.toString());

    // 6) admins (2/2)
    const admin1Pk = props.admin1 ? new PublicKey(props.admin1) : publicKey;
    const admin2Pk = props.admin2 ? new PublicKey(props.admin2) : publicKey;

    // 7) PDAs (escrowState + vault)
    const contractId32 = makeContractId32();
    requireValidContractId32(contractId32);
    const { escrowStatePda, vaultPda } = await findEscrowPdas(
      props.programId,
      publicKey,
      workerPk,
      contractId32,
    );

    // 8) ATA source (employer)
    const { ata: initializerUsdcAta } = await getOrCreateAta({
      connection,
      provider,
      payer: provider.wallet.publicKey,
      owner: publicKey,
      mint: mintPk,
    });
    const initializerAtaInfo = await getAccount(connection, initializerUsdcAta);
    if (!initializerAtaInfo.owner.equals(publicKey)) {
      alert("initializer_usdc_ata invalide: owner != initializer.");
      return;
    }
    if (!initializerAtaInfo.mint.equals(mintPk)) {
      alert("initializer_usdc_ata invalide: mint != usdc_mint.");
      return;
    }
    if (initializerAtaInfo.amount < amountBaseUnitsBigInt) {
      alert("Solde USDC insuffisant sur initializer_usdc_ata.");
      return;
    }

    // 9) comptes fee (optionnels selon l'IDL du programme buildé)
    const feeUsdcAtaFromConfig = props.feeUsdcAta || props.feeVaultAta || null;
    const hasFeeWalletConfig = !!props.feeWallet;
    const hasFeeVaultConfig = !!feeUsdcAtaFromConfig;
    let feeWalletPk = null;
    let feeUsdcAta = null;

    if (hasFeeWalletConfig && hasFeeVaultConfig) {
      feeWalletPk = new PublicKey(props.feeWallet);
      feeUsdcAta = new PublicKey(feeUsdcAtaFromConfig);
      const feeAtaInfo = await getAccount(connection, feeUsdcAta);
      if (!feeAtaInfo.owner.equals(feeWalletPk)) {
        alert("fee_usdc_ata invalide: owner != feeWallet.");
        return;
      }
      if (!feeAtaInfo.mint.equals(mintPk)) {
        alert("fee_usdc_ata invalide: mint != usdc_mint.");
        return;
      }
    }

    // 10) créer le draft DB (UUID du freelancer, PAS son wallet)
    txStatus.value = "Création du draft...";

    const amountTotalUsdc = Number(amountUsdcUi).toFixed(6);
    const draft = await createContract({
      freelancerUserUuid: freelancerUuid,
      amountTotalUsdc,
      title: String(form.title || "").trim(),
      description: String(form.description || "").trim(),
      jobId: form.jobId ?? null,
    });


    const contractUuid =
      draft?.contract?.uuid || draft?.uuid || draft?.contract_uuid;
    if (!contractUuid) {
      throw new Error("contract_uuid manquant après création du draft");
    }

    // 11) init escrow on-chain
    txStatus.value = "Signature initialize_escrow...";

    const feeBps = Number(props.feeBps ?? props.feePlatformBps);
    if (!Number.isFinite(feeBps) || feeBps < 0 || feeBps > 10_000) {
      alert("feeBps invalide.");
      return;
    }

    const sig = await initializeEscrow({
      program,
      contractId32,
      amountBaseUnitsBN: amountBaseUnits,
      feeBps,
      initializer: publicKey,
      worker: workerPk,
      admin1: admin1Pk,
      admin2: admin2Pk,
      escrowStatePda,
      vaultPda,
      usdcMint: mintPk,
      initializerUsdcAta,
      feeWallet: feeWalletPk || undefined,
      feeUsdcAta: feeUsdcAta || undefined,
    });

    // 12) notifier le back du funding + onchain addresses
    txStatus.value = "Envoi du funding...";

    const funded = await fundContract(contractUuid, {
      chain: props.chain,
      programId: props.programId,
      usdcMint: props.usdcMint,
      feeWallet: props.feeWallet ?? null,
      escrowStatePda: escrowStatePda.toBase58(),

      // ⚠️ dans ton back DTO: vaultAuthorityPda + escrowVaultAta
      // Ici on garde ton mapping existant (à adapter si ton programme utilise un autre PDA).
      vaultAuthorityPda: escrowStatePda.toBase58(),
      escrowVaultAta: vaultPda.toBase58(),

      feeVaultAta: props.feeVaultAta,
      feeUsdcAta: feeUsdcAtaFromConfig,
      fee_usdc_ata: feeUsdcAtaFromConfig,
      disputeVaultAta: props.disputeVaultAta,
      admin1FeeAta: props.admin1FeeAta ?? null,
      admin2FeeAta: props.admin2FeeAta ?? null,
      admin_1_fee_ata: props.admin1FeeAta ?? null,
      admin_2_fee_ata: props.admin2FeeAta ?? null,
      txSig: sig,
    });

    txStatus.value = "Contrat financé.";
    emit("created", funded || draft);
  } catch (err) {
    logTxFailure(err);
    alert(
      "Transaction échouée.\n👉 Regarde la console.\n" + (err?.message || ""),
    );
  } finally {
    loading.value = false;
  }
}
