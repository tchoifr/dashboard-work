import { defineStore } from "pinia";
import api from "../services/api";

function getMetaMask() {
  const eth = window.ethereum;
  if (!eth) return null;

  if (eth.providers?.length) {
    const mm = eth.providers.find((p) => p.isMetaMask && !p.isCoinbaseWallet);
    if (mm) return mm;
  }

  if (eth.isMetaMask && !eth.isCoinbaseWallet) return eth;
  return null;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: null,
    user: null,
  }),

  getters: {
    isLogged: (state) => !!state.token,
  },

  actions: {
    async loginWithWallet({ walletAddress, chain, username }) {
      const eth = getMetaMask();
      if (!eth) throw new Error("Metamask non détecté.");

      // 1) On récupère l’adresse réelle
      const [active] = await eth.request({ method: "eth_requestAccounts" });
      const address = active || walletAddress;
      console.log("Wallet utilisé =", address);

      // 2) On demande le nonce au backend
      const { data: nonceData } = await api.post("/auth/nonce", {
        walletAddress: address,
        chain,
        username,
      });

      console.log("MESSAGE DU BACKEND =", nonceData.message);

      const messageToSign =
        nonceData.message ||
        `Login nonce: ${nonceData.nonce || ""}`;

      // 3) SIGNATURE — en clair, sans hexlify
      const signature = await eth.request({
        method: "personal_sign",
        params: [messageToSign, address],
      });

      console.log("SIGNATURE =", signature);

      // 4) Vérif côté backend
      const { data: verifyData } = await api
        .post("/auth/verify", {
          walletAddress: address,
          signature,
          chain,
        })
        .catch((err) => {
          console.error("VERIFY ERROR RESPONSE =", err.response?.data || err.message);
          throw err;
        });

      console.log("VERIFY RESPONSE =", verifyData);

      // 5) On stocke
      this.token = verifyData.token;
      this.user = verifyData.user;

      return verifyData;
    },

    logout() {
      this.token = null;
      this.user = null;
    },
  },
});
