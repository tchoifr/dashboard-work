const WALLET_ERROR_CODES = Object.freeze({
  PROVIDER_NOT_FOUND: "WALLET_PROVIDER_NOT_FOUND",
  CONNECT_REJECTED: "WALLET_CONNECT_REJECTED",
  REQUEST_PENDING: "WALLET_REQUEST_PENDING",
  SIGN_REJECTED: "WALLET_SIGN_REJECTED",
  SIGN_UNSUPPORTED: "WALLET_SIGN_UNSUPPORTED",
});

const makeWalletError = (code, message, cause) => {
  const err = new Error(message);
  err.code = code;
  if (cause) err.cause = cause;
  return err;
};

const getErrorCode = (e) => Number(e?.code);
const getErrorMessage = (e) => String(e?.message || "").toLowerCase();

const waitForPublicKey = async (provider, timeoutMs = 1200) =>
  new Promise((resolve) => {
    const existing = provider?.publicKey;
    if (existing) {
      console.log("✅ [waitForPublicKey] Clé publique déjà présente:", existing.toBase58());
      resolve(existing);
      return;
    }

    console.log("⏳ [waitForPublicKey] En attente de la clé publique...");
    let done = false;
    let timer = null;

    const finish = (value) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      try {
        provider?.off?.("connect", onConnect);
        provider?.off?.("accountChanged", onAccountChanged);
      } catch {
        // no-op
      }
      console.log("🏁 [waitForPublicKey] Terminé avec:", value?.toBase58() || "null");
      resolve(value || null);
    };

    const onConnect = (pk) => {
      console.log("🔗 [waitForPublicKey] Événement 'connect' reçu");
      finish(pk || provider?.publicKey || null);
    };
    
    const onAccountChanged = (pk) => {
      console.log("🔄 [waitForPublicKey] Événement 'accountChanged' reçu");
      finish(pk || provider?.publicKey || null);
    };

    try {
      provider?.on?.("connect", onConnect);
      provider?.on?.("accountChanged", onAccountChanged);
    } catch {
      // no-op
    }

    timer = setTimeout(() => {
      console.log("⏰ [waitForPublicKey] Timeout atteint");
      finish(provider?.publicKey || null);
    }, timeoutMs);
  });

const mapConnectError = (e) => {
  const code = getErrorCode(e);
  const msg = getErrorMessage(e);

  console.log("🔍 [mapConnectError] Code:", code, "| Message:", msg);

  if (
    code === -32002 ||
    msg.includes("already pending") ||
    msg.includes("pending")
  ) {
    return makeWalletError(
      WALLET_ERROR_CODES.REQUEST_PENDING,
      "Une demande Phantom est deja en cours. Ouvre l'extension Phantom et valide-la.",
      e,
    );
  }

  if (
    code === 4001 ||
    msg.includes("rejected") ||
    msg.includes("user rejected")
  ) {
    return makeWalletError(
      WALLET_ERROR_CODES.CONNECT_REJECTED,
      "Connexion Phantom refusee. Ouvre l'extension, deverrouille le wallet, puis approuve la connexion pour localhost:5173.",
      e,
    );
  }

  return e;
};

const mapSignError = (e) => {
  const code = getErrorCode(e);
  const msg = getErrorMessage(e);

  console.log("🔍 [mapSignError] Code:", code, "| Message:", msg);

  if (
    code === -32002 ||
    msg.includes("already pending") ||
    msg.includes("pending")
  ) {
    return makeWalletError(
      WALLET_ERROR_CODES.REQUEST_PENDING,
      "Une demande Phantom est deja en cours. Ouvre l'extension Phantom et valide-la.",
      e,
    );
  }

  if (
    code === 4001 ||
    msg.includes("rejected") ||
    msg.includes("user rejected")
  ) {
    return makeWalletError(
      WALLET_ERROR_CODES.SIGN_REJECTED,
      "Signature refusee dans Phantom.",
      e,
    );
  }

  return e;
};

export { WALLET_ERROR_CODES };

export const getPhantomProvider = () => {
  console.log("🔎 [getPhantomProvider] Recherche du provider Phantom...");
  
  if (typeof window === "undefined") {
    console.log("❌ [getPhantomProvider] window est undefined");
    return null;
  }

  const injected = window.phantom?.solana;
  if (injected?.isPhantom) {
    console.log("✅ [getPhantomProvider] Trouvé via window.phantom.solana");
    return injected;
  }

  const sol = window.solana;
  if (sol?.isPhantom) {
    console.log("✅ [getPhantomProvider] Trouvé via window.solana");
    return sol;
  }

  if (Array.isArray(sol?.providers)) {
    const found = sol.providers.find((p) => p?.isPhantom) || null;
    if (found) {
      console.log("✅ [getPhantomProvider] Trouvé dans sol.providers");
    }
    return found;
  }

  console.log("❌ [getPhantomProvider] Aucun provider trouvé");
  return null;
};

export const getConnectedPhantomPublicKey = () => {
  console.log("🔑 [getConnectedPhantomPublicKey] Vérification de la clé publique...");
  const provider = getPhantomProvider();
  if (!provider?.publicKey) {
    console.log("❌ [getConnectedPhantomPublicKey] Pas de clé publique");
    return null;
  }
  console.log("✅ [getConnectedPhantomPublicKey]", provider.publicKey.toBase58());
  return provider.publicKey;
};

export const connectPhantom = async ({
  onlyIfTrusted = false,
  interactive = true,
} = {}) => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 [connectPhantom] DÉBUT DE LA CONNEXION");
  console.log("   onlyIfTrusted:", onlyIfTrusted);
  console.log("   interactive:", interactive);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const provider = getPhantomProvider();
  if (!provider) {
    console.log("❌ [connectPhantom] Provider non trouvé");
    throw makeWalletError(
      WALLET_ERROR_CODES.PROVIDER_NOT_FOUND,
      "Phantom non detecte. Installe l'extension Phantom.",
    );
  }

  // Déjà connecté
  if (provider.isConnected && provider.publicKey) {
    console.log("✅ [connectPhantom] Déjà connecté:", provider.publicKey.toBase58());
    return { provider, publicKey: provider.publicKey };
  }

  // 1) Mode silencieux : ne DOIT JAMAIS ouvrir de popup
  if (onlyIfTrusted) {
    console.log("🤫 [connectPhantom] Mode silencieux (onlyIfTrusted)...");
    try {
      const res = await provider.connect({ onlyIfTrusted: true });
      console.log("✅ [connectPhantom] Connexion silencieuse réussie");
      return {
        provider,
        publicKey: res?.publicKey || provider.publicKey || null,
      };
    } catch (e) {
      console.log("⚠️ [connectPhantom] Pas de connexion préalable (normal)");
      return { provider, publicKey: null };
    }
  }

  // 2) Mode interactif : appel direct pour conserver le user-gesture du clic.
  try {
    if (!interactive) {
      console.log("⚠️ [connectPhantom] Mode non-interactif");
      return { provider, publicKey: null };
    }

    console.log("🖱️ [connectPhantom] Appel de provider.connect() - Popup va s'ouvrir...");
    const res = await provider.connect();
    console.log("📦 [connectPhantom] Réponse de connect():", res);
    
    const finalPk =
      res?.publicKey ||
      provider.publicKey ||
      (await waitForPublicKey(provider));
    
    if (finalPk) {
      console.log("✅ [connectPhantom] Connexion réussie:", finalPk.toBase58());
    } else {
      console.log("⚠️ [connectPhantom] Pas de clé publique après connexion");
    }
    
    return { provider, publicKey: finalPk || null };
  } catch (e) {
    console.error("❌ [connectPhantom] Erreur lors de connect():", e);
    console.log("🔄 [connectPhantom] Tentative de récupération...");
    
    // Certains environnements renvoient une erreur alors que la connexion finit juste après.
    const settledPk =
      provider.publicKey || (await waitForPublicKey(provider, 1500));
    
    if (settledPk) {
      console.log("✅ [connectPhantom] Récupéré après erreur:", settledPk.toBase58());
      return { provider, publicKey: settledPk };
    }
    
    console.error("💥 [connectPhantom] Échec définitif");
    throw mapConnectError(e);
  }
};

export const signMessageWithPhantom = async (provider, encodedMessage) => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✍️ [signMessageWithPhantom] DÉBUT DE LA SIGNATURE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  console.log("📋 [signMessageWithPhantom] Provider:", provider);
  console.log("📋 [signMessageWithPhantom] Message encodé:", encodedMessage);
  console.log("📋 [signMessageWithPhantom] Message décodé:", new TextDecoder().decode(encodedMessage));
  
  if (!provider?.signMessage) {
    console.log("❌ [signMessageWithPhantom] signMessage non disponible");
    throw makeWalletError(
      WALLET_ERROR_CODES.SIGN_UNSUPPORTED,
      "Ce wallet ne supporte pas la signature de message.",
    );
  }

  try {
    console.log("🖊️ [signMessageWithPhantom] Appel de signMessage() - Popup va s'ouvrir...");
    console.log("   Appel sans paramètre display (nouvelle API Phantom)");
    
    // ✅ CORRECTION: Appeler signMessage() SANS le deuxième paramètre
    // L'ancienne API acceptait "utf8" ou "display", la nouvelle ne prend que le message
    const result = await provider.signMessage(encodedMessage);
    
    console.log("✅ [signMessageWithPhantom] Signature réussie!");
    console.log("📦 [signMessageWithPhantom] Résultat:", result);
    console.log("   - publicKey:", result.publicKey?.toBase58());
    console.log("   - signature length:", result.signature?.length);
    
    return result;
  } catch (e) {
    console.error("❌ [signMessageWithPhantom] Erreur de signature:", e);
    console.error("   - Code:", e.code);
    console.error("   - Message:", e.message);
    console.error("   - Stack:", e.stack);
    throw mapSignError(e);
  }
};

export const ensurePhantomMatchesWallet = async (expectedWalletAddress) => {
  console.log("🔐 [ensurePhantomMatchesWallet] Vérification...");
  console.log("   Wallet attendu:", expectedWalletAddress);
  
  const { provider, publicKey } = await connectPhantom();
  const connectedWallet = publicKey?.toBase58() || "";

  console.log("   Wallet connecté:", connectedWallet);

  if (
    expectedWalletAddress &&
    connectedWallet &&
    expectedWalletAddress !== connectedWallet
  ) {
    console.error("❌ [ensurePhantomMatchesWallet] Wallets différents!");
    throw new Error("Wallet Phantom different du compte connecte.");
  }

  console.log("✅ [ensurePhantomMatchesWallet] Wallets correspondent");
  return { provider, publicKey, connectedWallet };
};