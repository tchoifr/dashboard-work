import { defineStore } from "pinia"
import { authNonce, authVerify } from "../services/authApi"
import bs58 from "bs58"
import { connectPhantom, signMessageWithPhantom, WALLET_ERROR_CODES } from "../solana/phantom"
import { useWalletConfigStore } from "./walletConfig"
import { AUTH_ERROR_CODES, makeAuthError } from "../auth/errors"

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("token"),
    user: (() => {
      try {
        return JSON.parse(localStorage.getItem("user") || "null")
      } catch {
        return null
      }
    })(),
    loading: false,
    error: null,
    errorCode: null,

    // 🔒 lock interne anti double-submit
    _inFlight: false,
  }),

  getters: {
    isLogged: (state) => !!state.token,
    userUuid: (state) => state.user?.uuid || null,
  },

  actions: {
    /**
     * mode: "login" | "register"
     */
    async loginWithWallet({ username = null, mode = "login" } = {}) {
      // 🛑 garde-fou absolu
      if (this.loading || this._inFlight) {
        throw makeAuthError(
          WALLET_ERROR_CODES.REQUEST_PENDING,
          "Une demande Phantom est déjà en cours. Valide ou ferme la popup Phantom.",
        )
      }

      this.loading = true
      this._inFlight = true
      this.error = null
      this.errorCode = null

      try {
        // 0) Connect Phantom (user-gesture conservé)
        const { provider, publicKey } = await connectPhantom()
        const walletAddress = publicKey?.toBase58()
        if (!walletAddress) {
          throw makeAuthError(AUTH_ERROR_CODES.WALLET_MISSING, "Wallet introuvable.")
        }

        // 1) Wallet config (chain)
        const walletConfigStore = useWalletConfigStore()
        const walletConfig = await walletConfigStore.fetchWalletConfig({ auth: false })
        const chain = walletConfig?.chain
        if (!chain) {
          throw makeAuthError(
            AUTH_ERROR_CODES.CHAIN_MISSING,
            "Chain manquante depuis /wallet/config.",
          )
        }

        // 2) Nonce backend
        const nonceData = await authNonce(walletAddress, chain)
        const accountExists = nonceData?.accountExists === true
        const nonce = nonceData?.nonce
        if (!nonce) {
          throw makeAuthError(AUTH_ERROR_CODES.NONCE_MISSING, "Nonce manquant depuis le backend.")
        }

        // 3) Règles UX avant signature
        if (mode === "register" && accountExists) {
          throw makeAuthError(
            AUTH_ERROR_CODES.ACCOUNT_EXISTS,
            "Ce wallet a déjà un compte. Passe en mode connexion.",
          )
        }
        if (mode === "login" && !accountExists) {
          throw makeAuthError(
            AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND,
            "Aucun compte trouvé pour ce wallet. Crée un compte.",
          )
        }

        // 4) Signature
        const message = `Login nonce: ${nonce}`
        const encoded = new TextEncoder().encode(message)

        const signed = await signMessageWithPhantom(provider, encoded)
        const sigBytes = signed?.signature || signed
        const signatureBase58 = bs58.encode(sigBytes)

        // 5) Vérification backend → JWT
        const verifyData = await authVerify({
          walletAddress,
          signature: signatureBase58,
          nonce,
          username: mode === "register" ? (username || walletAddress) : undefined,
          chain,
          mode,
        })

        this.token = verifyData?.token || null
        this.user = {
          ...(verifyData?.user || {}),
          walletAddress,
          chain,
        }

        if (!this.token) {
          throw makeAuthError(
            AUTH_ERROR_CODES.TOKEN_MISSING,
            "Token manquant dans la réponse /auth/verify.",
          )
        }

        localStorage.setItem("token", this.token)
        localStorage.setItem("user", JSON.stringify(this.user))

        return verifyData
      } catch (e) {
        this.error = e?.message || "Erreur d’authentification"
        this.errorCode = e?.code || null
        throw e
      } finally {
        this.loading = false
        this._inFlight = false
      }
    },

    logout() {
      this.token = null
      this.user = null
      this.error = null
      this.errorCode = null
      this.loading = false
      this._inFlight = false
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    },
  },
})
