import { defineStore } from "pinia"
import api from "../services/api"
import bs58 from "bs58"
import { DEFAULT_CHAIN, connectPhantom, getPhantomProvider } from "../services/solana"

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: null,
    user: null,
  }),

  getters: {
    isLogged: (state) => !!state.token,
  },

  actions: {
    async loginWithWallet({ username, mode = "login" }) {

      // 1) Vérifier Phantom
      const phantom = getPhantomProvider()
      if (!phantom) throw new Error("Phantom non détecté.")

      const { publicKey } = await connectPhantom()
      const walletAddress = publicKey?.toBase58()
      if (!walletAddress) throw new Error("Wallet Phantom introuvable.")

      // 2) Demander le nonce
      const { data: nonceData } = await api.post("/auth/nonce", {
        walletAddress,
        chain: DEFAULT_CHAIN,
        username,
      })

      const isNew = nonceData.isNewUser === true

      // --- LOGIQUE LOGIN / SIGNUP ---
      if (mode === "signup" && !isNew) {
        throw new Error("Un compte existe déjà avec ce wallet.")
      }

      if (mode === "login" && isNew) {
        throw new Error("Aucun compte trouvé pour ce wallet.")
      }

      // 3) Préparer le message à signer
      const messageToSign = nonceData.message || `Login nonce: ${nonceData.nonce}`

      if (!phantom.signMessage) {
        throw new Error("Phantom ne supporte pas signMessage.")
      }

      const encoded = new TextEncoder().encode(messageToSign)
      const signed = await phantom.signMessage(encoded, "utf8")

      const sigBytes = signed.signature || signed
      const signatureBase58 = bs58.encode(sigBytes)

      // 4) Vérification backend
      const { data: verifyData } = await api.post("/auth/verify", {
      walletAddress,
      signature: signatureBase58,
      nonce: nonceData.nonce,   // 🔥 OBLIGATOIRE
      username,                 // utile pour signup
      chain: DEFAULT_CHAIN,
    })



      // 5) Stocker la session
      this.token = verifyData.token
      this.user = {
        ...(verifyData.user || {}),
        walletAddress,
        chain: DEFAULT_CHAIN,
      }

      return verifyData
    },

    logout() {
      this.token = null
      this.user = null
    },
  },
})
