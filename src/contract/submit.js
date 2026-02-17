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
import { parseContractIdU64 } from "./utils";

const DEVNET_MAINNET_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function requireValidContractIdU64(value) {
  const normalized = parseContractIdU64(value);
  return new BN(normalized, 10);
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

    const freelancerWalletAddress = freelancer.walletAddress;
    if (!freelancerWalletAddress) {
      alert("Le freelance sélectionné est invalide (wallet manquant).");
      return;
    }
    const workerPk = new PublicKey(freelancerWalletAddress);

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

    // 7) ATA source (employer)
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

    // 8) créer le draft DB (UUID du freelancer, PAS son wallet)
    txStatus.value = "Création du draft...";

    const amountTotalUsdc = Number(amountUsdcUi).toFixed(6);
    const startAtIso = form.timeline?.start ? `${form.timeline.start}T00:00:00` : null;
    const endAtIso = form.timeline?.end ? `${form.timeline.end}T23:59:59` : null;
    const checkpoints = String(form.checkpoints || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const draft = await createContract({
      freelancerUserUuid: freelancerUuid,
      amountTotalUsdc,
      title: String(form.title || "").trim(),
      name: String(form.title || "").trim(),
      description: String(form.description || "").trim(),
      checkpoints,
      validationCheckpoints: checkpoints,
      createdAt: startAtIso,
      created_at: startAtIso,
      findPeriodAt: endAtIso,
      find_period_at: endAtIso,
      startAt: startAtIso,
      endAt: endAtIso,
      start_at: startAtIso,
      end_at: endAtIso,
      jobId: form.jobId ?? null,
    });


    const contractUuid =
      draft?.contract?.uuid || draft?.uuid || draft?.contract_uuid;
    if (!contractUuid) {
      throw new Error("contract_uuid manquant après création du draft");
    }
    const contractIdU64Raw =
      draft?.contract?.contractIdU64 ||
      draft?.contract?.contract_id_u64 ||
      draft?.contract?.onchain?.contractIdU64 ||
      draft?.contract?.onchain?.contract_id_u64 ||
      draft?.contractIdU64 ||
      draft?.contract_id_u64;
    if (contractIdU64Raw === null || contractIdU64Raw === undefined || contractIdU64Raw === "") {
      throw new Error("contractIdU64 manquant côté backend.");
    }
    const contractIdU64 = requireValidContractIdU64(contractIdU64Raw);

    // 9) PDAs (escrowState + vault) à partir du contractIdU64 backend
    const { escrowStatePda, vaultPda } = await findEscrowPdas(
      props.programId,
      publicKey,
      workerPk,
      contractIdU64,
    );

    // 10) init escrow on-chain
    txStatus.value = "Signature initialize_escrow...";

    const feeBps = Number(props.feeBps ?? props.feePlatformBps);
    if (!Number.isFinite(feeBps) || feeBps < 0 || feeBps > 10_000) {
      alert("feeBps invalide.");
      return;
    }

    const sig = await initializeEscrow({
      program,
      contractIdU64,
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
      adminFeeAccount: feeUsdcAta || undefined,
    });

    // 11) notifier le back du funding + onchain addresses
    txStatus.value = "Envoi du funding...";

    const funded = await fundContract(contractUuid, {
      escrowStatePda: escrowStatePda.toBase58(),
      vaultPda: vaultPda.toBase58(),
      txSig: sig,
    });

    txStatus.value = "Contrat financé.";
    const draftContract = draft?.contract || draft || {}
    const fundedContract = funded?.contract || funded || {}
    const employerName = auth?.user?.username || auth?.user?.name || null
    const employerWallet = publicKey?.toBase58?.() || walletAddress.value || null
    const freelancerName = freelancer?.label || freelancer?.username || freelancer?.name || null
    const freelancerWallet = freelancerWalletAddress || null
    emit("created", {
      ...draftContract,
      ...fundedContract,
      uuid: draftContract.uuid || fundedContract.uuid || contractUuid,
      title: draftContract.title || String(form.title || "").trim(),
      description: draftContract.description || String(form.description || "").trim(),
      checkpoints: draftContract.checkpoints || checkpoints,
      amountUsdc:
        draftContract.amountUsdc ||
        draftContract.amount_usdc ||
        fundedContract.amountUsdc ||
        fundedContract.amount_usdc ||
        amountTotalUsdc,
      createdAt: draftContract.createdAt || draftContract.created_at || startAtIso,
      findPeriodAt:
        draftContract.findPeriodAt ||
        draftContract.find_period_at ||
        fundedContract.findPeriodAt ||
        fundedContract.find_period_at ||
        endAtIso,
      startAt:
        draftContract.startAt ||
        draftContract.start_at ||
        draftContract.createdAt ||
        draftContract.created_at ||
        form.timeline?.start ||
        null,
      endAt:
        draftContract.endAt ||
        draftContract.end_at ||
        draftContract.findPeriodAt ||
        draftContract.find_period_at ||
        form.timeline?.end ||
        null,
      contractIdU64:
        draftContract.contractIdU64 ||
        draftContract.contract_id_u64 ||
        String(contractIdU64Raw),
      employerName:
        draftContract.employerName ||
        draftContract.employer_name ||
        fundedContract.employerName ||
        fundedContract.employer_name ||
        employerName,
      employerWallet:
        draftContract.employerWallet ||
        draftContract.employer_wallet ||
        draftContract.initializerWallet ||
        draftContract.initializer_wallet ||
        fundedContract.employerWallet ||
        fundedContract.employer_wallet ||
        fundedContract.initializerWallet ||
        fundedContract.initializer_wallet ||
        employerWallet,
      freelancerName:
        draftContract.freelancerName ||
        draftContract.freelancer_name ||
        fundedContract.freelancerName ||
        fundedContract.freelancer_name ||
        freelancerName,
      freelancerWallet:
        draftContract.freelancerWallet ||
        draftContract.freelancer_wallet ||
        draftContract.workerWallet ||
        draftContract.worker_wallet ||
        fundedContract.freelancerWallet ||
        fundedContract.freelancer_wallet ||
        fundedContract.workerWallet ||
        fundedContract.worker_wallet ||
        freelancerWallet,
      employer: {
        ...(draftContract.employer || {}),
        ...(fundedContract.employer || {}),
        username:
          draftContract.employer?.username ||
          fundedContract.employer?.username ||
          employerName,
        walletAddress:
          draftContract.employer?.walletAddress ||
          draftContract.employer?.wallet_address ||
          fundedContract.employer?.walletAddress ||
          fundedContract.employer?.wallet_address ||
          employerWallet,
      },
      freelancer: {
        ...(draftContract.freelancer || {}),
        ...(fundedContract.freelancer || {}),
        username:
          draftContract.freelancer?.username ||
          fundedContract.freelancer?.username ||
          freelancerName,
        walletAddress:
          draftContract.freelancer?.walletAddress ||
          draftContract.freelancer?.wallet_address ||
          fundedContract.freelancer?.walletAddress ||
          fundedContract.freelancer?.wallet_address ||
          freelancerWallet,
      },
      vaultPda: fundedContract.vaultPda || fundedContract.vault_pda || vaultPda.toBase58(),
      escrowStatePda: fundedContract.escrowStatePda || fundedContract.escrow_state_pda || escrowStatePda.toBase58(),
    });
  } catch (err) {
    logTxFailure(err);
    alert(
      "Transaction échouée.\n👉 Regarde la console.\n" + (err?.message || ""),
    );
  } finally {
    loading.value = false;
  }
}
