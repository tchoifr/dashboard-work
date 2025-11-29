<script setup>
import { ref } from "vue"
import axios from "axios"

const mode = ref("login")          // "login" ou "register"
const username = ref("")           // utilisé seulement en register
const emit = defineEmits(["connected"])

// ==================================================
//  ➤ FONCTIONS WEB3 : ETHEREUM (Metamask)
// ==================================================
async function connectMetamask() {
  if (!window.ethereum) {
    alert("⚠️ Installe Metamask.")
    return null
  }

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts"
  })

  return accounts[0]
}

async function signMessageETH(message) {
  return await window.ethereum.request({
    method: "personal_sign",
    params: [message, window.ethereum.selectedAddress]
  })
}

// ==================================================
//  ➤ FONCTIONS WEB3 : SOLANA (Phantom)
// ==================================================
async function connectPhantom() {
  if (!window.solana?.isPhantom) {
    alert("⚠️ Installe Phantom Wallet.")
    return null
  }

  const resp = await window.solana.connect()
  return resp.publicKey.toString()
}

async function signMessageSOL(message) {
  // Phantom attend un Uint8Array
  const encoded = new TextEncoder().encode(message)
  const signed = await window.solana.signMessage(encoded, "utf8")

  // On renvoie la signature en hex (backend attend hex)
  return Buffer.from(signed.signature).toString("hex")
}

// ==================================================
//  ➤ FLUX COMPLET LOGIN / REGISTER
// ==================================================
async function handleProceed() {
  let walletAddress = null
  let chain = null

  // 1️⃣ Détection du wallet ETH ou SOL
  if (window.ethereum) {
    walletAddress = await connectMetamask()
    chain = "ethereum"
  } else if (window.solana?.isPhantom) {
    walletAddress = await connectPhantom()
    chain = "solana"
  } else {
    alert("⚠️ Aucun wallet Web3 détecté.")
    return
  }

  // 2️⃣ Demander le nonce au backend
  const nonceRes = await axios.post("http://localhost:8000/auth/nonce", {
    walletAddress,
    chain,
    username: mode.value === "register" ? username.value : null
  })

  const nonce = nonceRes.data.nonce
  const message = `Login nonce: ${nonce}`

  // 3️⃣ Le wallet signe le message
  let signature
  if (chain === "ethereum") signature = await signMessageETH(message)
  else signature = await signMessageSOL(message)

  // 4️⃣ Vérification backend
  const verifyRes = await axios.post("http://localhost:8000/auth/verify", {
    walletAddress,
    signature
  })

  const token = verifyRes.data.token
  const user = verifyRes.data.user

  // 5️⃣ Renvoie au parent
  emit("connected", {
    token,
    walletAddress,
    chain,
    user,
  })
}

function setRegister() {
  mode.value = "register"
}

function setLogin() {
  mode.value = "login"
}
</script>

<template>
  <section class="auth">
    <div class="card">

      <div class="icon"><span>WORK</span></div>

      <h1>Connexion Web3</h1>
      <p class="lead">Connecte-toi ou crée un compte via ton wallet décentralisé.</p>

      <!-- Nom d'utilisateur uniquement en register -->
      <div v-if="mode === 'register'" class="form-group">
        <label>Nom d’utilisateur</label>
        <input type="text" v-model="username" placeholder="ex: Mina Chen" />
      </div>

      <button class="btn primary" @click="handleProceed">
        {{ mode === "login" ? "Connecter mon wallet" : "Créer mon compte" }}
      </button>

      <button class="link" v-if="mode === 'login'" @click="setRegister">
        Créer un compte
      </button>

      <button class="link" v-if="mode === 'register'" @click="setLogin">
        J’ai déjà un compte
      </button>

    </div>
  </section>
</template>


<style scoped>
.auth {
  min-height: calc(100vh - 40px);
  display: grid;
  place-items: center;
  padding: 20px 12px 40px;
}

.card {
  width: min(560px, 100%);
  background: linear-gradient(150deg, rgba(8, 12, 24, 0.96), rgba(10, 17, 32, 0.94));
  border: 1px solid rgba(120, 90, 255, 0.35);
  box-shadow:
    0 20px 48px rgba(0, 0, 0, 0.35),
    0 0 22px rgba(120, 90, 255, 0.2),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  border-radius: 20px;
  padding: 32px 28px;
  display: grid;
  justify-items: center;
  gap: 14px;
  position: relative;
  overflow: hidden;
}

.card::before {
  content: '';
  position: absolute;
  inset: -30% -20% auto -20%;
  height: 50%;
  background: radial-gradient(circle, rgba(120, 90, 255, 0.12), transparent 55%);
  pointer-events: none;
}

.icon {
  height: 92px;
  width: 92px;
  border-radius: 18px;
  background: radial-gradient(circle at 50% 20%, rgba(120, 90, 255, 0.6), rgba(8, 17, 30, 0.9)),
    linear-gradient(145deg, #0c1f35, #0c2542);
  display: grid;
  place-items: center;
  border: 1px solid rgba(120, 90, 255, 0.45);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4), 0 0 18px rgba(120, 90, 255, 0.32);
}

.icon span {
  color: #e8f5ff;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.lead {
  color: #9eb2d6;
  text-align: center;
}

.btn.primary {
  background: linear-gradient(90deg, #6a48ff, #00c6ff);
  border: 1px solid rgba(120, 90, 255, 0.4);
  color: #061227;
  border-radius: 24px;
  width: 100%;
  padding: 14px 18px;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 18px 36px rgba(0, 102, 255, 0.35);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 20px 40px rgba(0, 102, 255, 0.42);
}

.btn.primary:active {
  transform: translateY(0);
}

.btn {
  font: inherit;
}

.link {
  background: transparent;
  border: none;
  color: #8ad4ff;
  font-weight: 700;
  cursor: pointer;
}
.link:hover {
  color: #b4e4ff;
  text-decoration: underline;
}
</style>
