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
      // mode = "login" ou "signup"
      const phantom = getPhantomProvider()
      if (!phantom) throw new Error("Phantom non détecté.")

      const { publicKey } = await connectPhantom()
      const walletAddress = publicKey?.toBase58()
      if (!walletAddress) throw new Error("Wallet Phantom introuvable.")

      // ----- 1) Demande du nonce -----
     const { data: nonceData } = await api.post("/auth/nonce", {
  walletAddress,
  chain: DEFAULT_CHAIN,
  username,
})

// message affiché selon si l'utilisateur existe déjà
if (!nonceData.isNew) {
  console.log("Vous avez déjà un compte, connexion…")
  alert("Vous avez déjà un compte. Connexion…")
} else {
  console.log("Création d’un nouveau compte…")
  alert("Création d’un nouveau compte…")
}

      // ----- 2) Gestion login/signup -----
      // Si un compte existe mais on clique "Créer un compte"
      if (!nonceData.isNewUser && mode === "signup") {
        throw new Error("Un compte existe déjà avec ce wallet.")
      }

      // Si aucun compte n'existe mais on clique "Connexion"
      if (nonceData.isNewUser && mode === "login") {
        throw new Error("Aucun compte associé à ce wallet.")
      }

      // ----- 3) Signature du message -----
      const messageToSign =
        nonceData.message || `Login nonce: ${nonceData.nonce || ""}`

      if (!phantom.signMessage) {
        throw new Error("Phantom ne supporte pas signMessage.")
      }

      const encoded = new TextEncoder().encode(messageToSign)
      const signed = await phantom.signMessage(encoded, "utf8")

      const sigBytes = signed.signature || signed
      const signatureBase58 = bs58.encode(sigBytes)

      // ----- 4) Vérification avec backend -----
      const { data: verifyData } = await api
        .post("/auth/verify", {
          walletAddress,
          signature: signatureBase58,
          chain: DEFAULT_CHAIN,
        })
        .catch((err) => {
          console.error(
            "VERIFY ERROR RESPONSE =",
            err.response?.data || err.message,
          )
          throw err
        })

      // ----- 5) Stockage session -----
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
