// src/store/auth.js (Pinia)
import { defineStore } from "pinia"
import publicApi from "../services/publicApi"
import bs58 from "bs58"
import { DEFAULT_CHAIN, connectPhantom, getPhantomProvider } from "../services/solana"

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
  }),

  getters: {
    isLogged: (state) => !!state.token,
    userUuid: (state) => state.user?.uuid || null,
  },

  actions: {
    /**
     * mode: "login" | "register"
     */
    async loginWithWallet({ username = null, mode = "login" }) {
      this.loading = true
      this.error = null

      try {
        const phantom = getPhantomProvider()
        if (!phantom) throw new Error("Phantom non détecté")

        // 1) Connect wallet
        const { publicKey } = await connectPhantom()
        const walletAddress = publicKey?.toBase58()
        if (!walletAddress) throw new Error("Wallet introuvable")

        // 2) Ask nonce
        const { data: nonceData } = await publicApi.post("/auth/nonce", {
          walletAddress,
          chain: DEFAULT_CHAIN,
        })

        // Backend -> { nonce, accountExists }
        const accountExists = nonceData.accountExists === true
        const nonce = nonceData.nonce

        if (!nonce) throw new Error("Nonce manquant depuis le backend")

        // 3) UX rules (block BEFORE signing)
        if (mode === "register" && accountExists) {
          // IMPORTANT: on ne signe pas, on ne call pas /auth/verify
          throw new Error("Ce wallet a déjà un compte. Passe en mode connexion.")
        }

        if (mode === "login" && !accountExists) {
          throw new Error("Aucun compte trouvé pour ce wallet. Crée un compte.")
        }

        // 4) Build message & sign
        const message = `Login nonce: ${nonce}`
        const encoded = new TextEncoder().encode(message)

        const signed = await phantom.signMessage(encoded, "utf8")
        const sigBytes = signed?.signature || signed
        const signatureBase58 = bs58.encode(sigBytes)

        // 5) Verify signature -> create/login + return JWT
        const { data: verifyData } = await publicApi.post("/auth/verify", {
          walletAddress,
          signature: signatureBase58,
          nonce, // utile si le user n'existe pas encore (dans ton back)
          username: mode === "register" ? (username || walletAddress) : undefined,
          chain: DEFAULT_CHAIN,
          mode, // (optionnel: si tu veux renforcer côté back plus tard)
        })

        this.token = verifyData.token
        this.user = {
          ...(verifyData.user || {}),
          walletAddress,
          chain: DEFAULT_CHAIN,
        }

        localStorage.setItem("token", this.token)
        localStorage.setItem("user", JSON.stringify(this.user))

        return verifyData
      } catch (e) {
        this.error = e?.message || "Erreur d’authentification"
        throw e
      } finally {
        this.loading = false
      }
    },

    logout() {
      this.token = null
      this.user = null
      this.error = null
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    },
  },
})
