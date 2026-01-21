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
    async loginWithWallet({ username, mode = "login" }) {
      this.loading = true
      this.error = null

      try {
        const phantom = getPhantomProvider()
        if (!phantom) throw new Error("Phantom non détecté")

        const { publicKey } = await connectPhantom()
        const walletAddress = publicKey?.toBase58()
        if (!walletAddress) throw new Error("Wallet introuvable")

        const { data: nonceData } = await publicApi.post("/auth/nonce", {
          walletAddress,
          chain: DEFAULT_CHAIN,
          username,
        })

        const isNew = nonceData.isNewUser === true

        if (mode === "signup" && !isNew) throw new Error("Compte déjà existant")
        if (mode === "login" && isNew) throw new Error("Aucun compte trouvé")

        const message = nonceData.message || `Login nonce: ${nonceData.nonce}`
        const encoded = new TextEncoder().encode(message)

        const signed = await phantom.signMessage(encoded, "utf8")
        const sigBytes = signed.signature || signed
        const signatureBase58 = bs58.encode(sigBytes)

        const { data: verifyData } = await publicApi.post("/auth/verify", {
          walletAddress,
          signature: signatureBase58,
          nonce: nonceData.nonce,
          username,
          chain: DEFAULT_CHAIN,
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
        this.error = e.message || "Erreur d’authentification"
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
