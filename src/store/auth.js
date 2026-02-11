// src/store/auth.js
import { defineStore } from "pinia";
import { authNonce, authVerify } from "../services/authApi";
import {
  connectPhantom,
  signMessageWithPhantom,
  getConnectedPhantomPublicKey,
  WALLET_ERROR_CODES,
} from "../solana/phantom";
import { AUTH_ERROR_CODES, makeAuthError } from "../auth/errors";
import { useWalletConfigStore } from "./walletConfig";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    token: null,
    loading: false,
    // ✅ NOUVEAU: Stockage du nonce pré-chargé
    preloadedNonce: null,
    preloadedWallet: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
  },

  actions: {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ✅ NOUVELLE FONCTION: Pré-chargement du nonce
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async preloadNonce() {
      try {
        console.log("🔍 [preloadNonce] Vérification connexion silencieuse...");
        
        // Tentative de connexion silencieuse (sans popup)
        const { publicKey } = await connectPhantom({
          onlyIfTrusted: true,
          interactive: false,
        });

        if (!publicKey) {
          console.log("⚠️ [preloadNonce] Wallet non connecté");
          return;
        }

        const walletAddress = publicKey.toBase58();
        console.log("✅ [preloadNonce] Wallet connecté:", walletAddress);

        // Récupérer la config (chain)
        const walletConfigStore = useWalletConfigStore();
        await walletConfigStore.fetchWalletConfig({ auth: false });
        const chain = walletConfigStore.chain;

        if (!chain) {
          console.log("⚠️ [preloadNonce] Pas de chain configurée");
          return;
        }

        // Pré-charger le nonce
        console.log("🎲 [preloadNonce] Récupération du nonce...");
        const { nonce } = await authNonce(walletAddress, chain);
        
        this.preloadedNonce = nonce;
        this.preloadedWallet = walletAddress;
        
        console.log("✅ [preloadNonce] Nonce pré-chargé:", nonce);
      } catch (error) {
        console.log("⚠️ [preloadNonce] Erreur (ignorée):", error.message);
        // Erreur ignorée - ce n'est qu'un pré-chargement
      }
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FONCTION PRINCIPALE DE CONNEXION (MODIFIÉE)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async loginWithWallet({ username = null, mode = "login" } = {}) {
      this.loading = true;

      try {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🚀 [loginWithWallet] DÉBUT");
        console.log("   Mode:", mode);
        console.log("   Username:", username);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ÉTAPE 1: CONNEXION AU WALLET
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        console.log("🔌 [loginWithWallet] Connexion au wallet...");
        const { provider, publicKey } = await connectPhantom({
          interactive: true,
        });

        if (!publicKey) {
          throw makeAuthError(
            AUTH_ERROR_CODES.WALLET_CONNECTION_FAILED,
            "Impossible de récupérer la clé publique du wallet"
          );
        }

        const walletAddress = publicKey.toBase58();
        console.log("✅ [loginWithWallet] Wallet connecté:", walletAddress);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ÉTAPE 2: RÉCUPÉRATION DE LA CHAIN
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const walletConfigStore = useWalletConfigStore();
        await walletConfigStore.fetchWalletConfig({ auth: false });
        const chain = walletConfigStore.chain;

        if (!chain) {
          throw makeAuthError(
            AUTH_ERROR_CODES.CONFIG_ERROR,
            "Configuration chain manquante"
          );
        }
        console.log("🔗 [loginWithWallet] Chain:", chain);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ÉTAPE 3: RÉCUPÉRATION DU NONCE
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        let nonce = null;
        let accountExists = false;

        // ✅ Utiliser le nonce pré-chargé si disponible et pour le bon wallet
        if (
          this.preloadedNonce &&
          this.preloadedWallet === walletAddress
        ) {
          console.log("⚡ [loginWithWallet] Utilisation du nonce pré-chargé");
          nonce = this.preloadedNonce;
          // On considère que le compte existe si on a pu pré-charger
          accountExists = true;
        } else {
          console.log("🎲 [loginWithWallet] Récupération du nonce...");
          const nonceData = await authNonce(walletAddress, chain);
          nonce = nonceData.nonce;
          accountExists = nonceData.accountExists;
          console.log("✅ [loginWithWallet] Nonce:", nonce);
          console.log("ℹ️ [loginWithWallet] Compte existe:", accountExists);
        }

        // Nettoyer le nonce pré-chargé (usage unique)
        this.preloadedNonce = null;
        this.preloadedWallet = null;

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ÉTAPE 4: VALIDATION MODE vs COMPTE
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (mode === "login" && !accountExists) {
          throw makeAuthError(
            AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND,
            "Aucun compte trouvé pour ce wallet. Crée un compte d'abord."
          );
        }

        if (mode === "register" && accountExists) {
          throw makeAuthError(
            AUTH_ERROR_CODES.ACCOUNT_EXISTS,
            "Un compte existe déjà pour ce wallet. Connecte-toi."
          );
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ÉTAPE 5: SIGNATURE DU MESSAGE
        // ⚠️ CRITIQUE: Pas de délai async avant cette étape !
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        console.log("✍️ [loginWithWallet] Demande de signature...");
        const message = `Login nonce: ${nonce}`;
        const encodedMessage = new TextEncoder().encode(message);

        let signatureResult;
        try {
          signatureResult = await signMessageWithPhantom(
            provider,
            encodedMessage
          );
          console.log("✅ [loginWithWallet] Signature réussie");
        } catch (signError) {
          console.error("❌ [loginWithWallet] Erreur de signature:", signError);
          throw signError; // Propager l'erreur (déjà mappée dans phantom.js)
        }

        // Conversion de la signature en base64
        const signature = btoa(
          String.fromCharCode(...signatureResult.signature)
        );

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ÉTAPE 6: VÉRIFICATION AVEC LE BACKEND
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        console.log("✔️ [loginWithWallet] Vérification avec le backend...");
        const verifyPayload = {
          walletAddress,
          signature,
          nonce,
          chain,
        };

        if (mode === "register" && username) {
          verifyPayload.username = username;
        }

        let verifyData;
        try {
          verifyData = await authVerify(verifyPayload);
        } catch (verifyError) {
          console.error("❌ [loginWithWallet] Vérification échouée:", verifyError);
          throw makeAuthError(
            AUTH_ERROR_CODES.VERIFICATION_FAILED,
            verifyError.message || "Signature invalide"
          );
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ÉTAPE 7: SAUVEGARDE DES DONNÉES
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        this.token = verifyData.token;
        this.user = verifyData.user;

        localStorage.setItem("auth_token", verifyData.token);
        localStorage.setItem("user", JSON.stringify(verifyData.user));

        console.log("🎉 [loginWithWallet] Authentification réussie!");
        console.log("   User:", verifyData.user);

        return verifyData;
      } catch (error) {
        console.error("💥 [loginWithWallet] Erreur globale:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // DÉCONNEXION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    logout() {
      this.user = null;
      this.token = null;
      this.preloadedNonce = null;
      this.preloadedWallet = null;
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      console.log("👋 Déconnexion réussie");
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // RESTAURATION DEPUIS LOCALSTORAGE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    restoreFromLocalStorage() {
      const token = localStorage.getItem("auth_token");
      const userStr = localStorage.getItem("user");

      if (token && userStr) {
        try {
          this.token = token;
          this.user = JSON.parse(userStr);
          console.log("✅ Session restaurée:", this.user);
        } catch (error) {
          console.error("❌ Erreur restauration session:", error);
          this.logout();
        }
      }
    },
  },
});