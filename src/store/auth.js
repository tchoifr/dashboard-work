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
    async loginWithWallet({ username = null, mode = "login" }) {
      const phantom = getPhantomProvider()
      if (!phantom) throw new Error("Phantom non détecté.")

      // 1) Connexion Phantom → récupération de l'adresse
      const { publicKey } = await connectPhantom()
      const walletAddress = publicKey?.toBase58()
      if (!walletAddress) throw new Error("Wallet Phantom introuvable.")

      // 2) Demande du nonce
      const { data: nonceData } = await api.post("/auth/nonce", {
        walletAddress,
        chain: DEFAULT_CHAIN,
        username, // utilisé SEULEMENT si creation
      })

      const exists = nonceData.accountExists === true

      // 3) Mode login/register → validation logique
      if (mode === "register" && exists) {
        throw new Error("Un compte existe déjà avec ce wallet.")
      }

      if (mode === "login" && !exists) {
        throw new Error("Aucun compte associé à ce wallet.")
      }

      // 4) Signature du nonce
      const messageToSign = nonceData.message

      if (!phantom.signMessage) {
        throw new Error("Phantom ne supporte pas signMessage.")
      }

      const encoded = new TextEncoder().encode(messageToSign)
      const signed = await phantom.signMessage(encoded, "utf8")

      const sigBytes = signed.signature || signed
      const signatureBase58 = bs58.encode(sigBytes)

      // 5) Vérification backend
      const { data: verifyData } = await api.post("/auth/verify", {
        walletAddress,
        signature: signatureBase58,
        chain: DEFAULT_CHAIN,
      })

      // 6) Session
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
