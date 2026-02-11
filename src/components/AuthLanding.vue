<script setup>
import { computed, onMounted, ref } from "vue"
import { useAuthStore } from "../store/auth"
import { useWalletConfigStore } from "../store/walletConfig"
import { authNonce, authVerify } from "../services/authApi"

const auth = useAuthStore()
const walletConfigStore = useWalletConfigStore()
const emit = defineEmits(["connected"])

const mode = ref("login")
const username = ref("")
const ready = ref(false)
const nonce = ref(null)
const walletAddress = ref("")
const chain = ref(null)
const uiError = ref("")
const isBusy = ref(false)

const shortAddress = computed(() => {
  if (!walletAddress.value) return ""
  return `${walletAddress.value.slice(0, 4)}...${walletAddress.value.slice(-4)}`
})

const connectLabel = computed(() => {
  if (mode.value === "login") return "Connecter Phantom"
  return "Creer mon compte"
})

onMounted(async () => {
  await walletConfigStore.fetchWalletConfig({ auth: false })
  chain.value = walletConfigStore.chain
})

function resetStep() {
  ready.value = false
  nonce.value = null
}

function getPhantomProvider() {
  const provider = window?.phantom?.solana || window?.solana
  if (!provider?.isPhantom) {
    throw new Error("Phantom non detecte. Verifie que l'extension est active sur localhost.")
  }
  return provider
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForPublicKey(provider, timeoutMs = 1500) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (provider?.publicKey) return provider.publicKey
    await sleep(50)
  }
  return provider?.publicKey || null
}

async function connectPhantomRobust(provider) {
  if (provider?.isConnected && provider?.publicKey) {
    return provider.publicKey
  }

  try {
    const res = await provider.connect()
    return res?.publicKey || provider.publicKey || null
  } catch (error) {
    // Phantom peut parfois throw alors que la connexion se finalise juste après.
    const settledPublicKey = await waitForPublicKey(provider, 1800)
    if (settledPublicKey) return settledPublicKey
    throw error
  }
}

async function prepare() {
  if (isBusy.value) return
  isBusy.value = true
  uiError.value = ""

  try {
    if (mode.value === "register" && !username.value.trim()) {
      throw new Error("Entre un nom d'utilisateur pour creer un compte.")
    }

    const provider = getPhantomProvider()
    const pk = await connectPhantomRobust(provider)
    if (!pk) {
      throw new Error("Impossible de recuperer la cle publique du wallet.")
    }

    walletAddress.value = pk.toBase58()

    const { nonce: serverNonce, accountExists } = await authNonce(walletAddress.value, chain.value)
    nonce.value = serverNonce

    if (mode.value === "login" && !accountExists) {
      uiError.value = "Aucun compte trouve. Cree un compte d'abord."
      mode.value = "register"
      return
    }

    if (mode.value === "register" && accountExists) {
      uiError.value = "Un compte existe deja. Connecte-toi."
      mode.value = "login"
      return
    }

    ready.value = true
  } catch (error) {
    const raw = error?.message || String(error) || ""
    const lower = raw.toLowerCase()
    if (lower.includes("already pending") || lower.includes("pending")) {
      uiError.value = "Une demande Phantom est deja en attente. Ouvre l'extension Phantom et valide-la."
    } else if (lower.includes("rejected")) {
      uiError.value = "Demande refusee ou ignoree dans Phantom. Ouvre l'extension Phantom, deverrouille-la, puis clique Connect."
    } else {
      uiError.value = raw || "Erreur de connexion wallet"
    }
  } finally {
    isBusy.value = false
  }
}

async function sign() {
  if (isBusy.value) return
  isBusy.value = true
  uiError.value = ""

  try {
    if (!nonce.value) {
      throw new Error("Nonce manquant. Clique d'abord sur connexion.")
    }

    const provider = getPhantomProvider()
    if (!provider?.signMessage) {
      throw new Error("Ce wallet ne supporte pas la signature de message.")
    }

    const encodedMessage = new TextEncoder().encode(`Login nonce: ${nonce.value}`)
    const signed = await provider.signMessage(encodedMessage)
    const signatureBytes = signed?.signature || signed
    const signature = btoa(String.fromCharCode(...signatureBytes))

    const payload = {
      walletAddress: walletAddress.value,
      signature,
      nonce: nonce.value,
      chain: chain.value,
    }

    if (mode.value === "register" && username.value.trim()) {
      payload.username = username.value.trim()
    }

    const res = await authVerify(payload)

    auth.token = res.token
    auth.user = res.user
    localStorage.setItem("auth_token", res.token)
    localStorage.setItem("user", JSON.stringify(res.user))

    emit("connected", res)
  } catch (error) {
    uiError.value = error?.message || "Erreur de signature"
    resetStep()
  } finally {
    isBusy.value = false
  }
}

async function disconnectWallet() {
  try {
    const provider = window?.phantom?.solana || window?.solana
    await provider?.disconnect?.()
  } catch {
    // no-op
  }
  walletAddress.value = ""
  resetStep()
}
</script>

<template>
  <section class="auth">
    <div class="card">
      <div class="icon">
        <img style="width: 100%" src="../assets/byhnexLogo.png" alt="Byhnex" />
      </div>

      <h1>Byhnex</h1>
      <p class="lead">Connexion ou creation de compte via Phantom.</p>

      <div v-if="mode === 'register' && !ready" class="form-group">
        <label>Nom d'utilisateur</label>
        <input
          v-model="username"
          type="text"
          placeholder="ex: Mina Chen"
          :disabled="isBusy"
        />
      </div>

      <button
        v-if="!ready"
        class="btn primary"
        :disabled="isBusy"
        @click="prepare"
      >
        {{ connectLabel }}
      </button>

      <div v-if="ready" class="stack">
        <div class="notice ok">
          <p>Wallet connecte</p>
          <small>{{ shortAddress }}</small>
        </div>

        <div class="notice warn">
          <p>Approuve la signature dans Phantom pour terminer l'authentification.</p>
        </div>

        <button class="btn primary" :disabled="isBusy" @click="sign">
          {{ isBusy ? "Signature en cours..." : "Signer et confirmer" }}
        </button>

        <button class="link" :disabled="isBusy" @click="disconnectWallet">
          Changer de wallet
        </button>
      </div>

      <p v-if="uiError" class="error">{{ uiError }}</p>

      <button
        v-if="!ready && mode === 'login'"
        class="link"
        :disabled="isBusy"
        @click="mode = 'register'"
      >
        Creer un compte
      </button>

      <button
        v-if="!ready && mode === 'register'"
        class="link"
        :disabled="isBusy"
        @click="mode = 'login'"
      >
        J'ai deja un compte
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
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.35), 0 0 22px rgba(120, 90, 255, 0.2),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  border-radius: 20px;
  padding: 32px 28px;
  display: grid;
  justify-items: center;
  gap: 14px;
}

.icon {
  width: 96px;
}

h1 {
  margin: 0;
  color: #f4f7ff;
}

.lead {
  margin: 0;
  color: #9eb2d6;
  text-align: center;
}

.form-group {
  width: 100%;
  display: grid;
  gap: 8px;
}

.form-group label {
  color: #b8c8e8;
  font-size: 14px;
}

.form-group input {
  border: 1px solid rgba(138, 212, 255, 0.25);
  background: rgba(7, 14, 28, 0.85);
  color: #e8f2ff;
  border-radius: 12px;
  padding: 11px 14px;
}

.btn {
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 12px 14px;
  font-weight: 700;
  cursor: pointer;
}

.btn.primary {
  color: #04111f;
  background: linear-gradient(90deg, #8ad4ff, #7fa6ff);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.stack {
  width: 100%;
  display: grid;
  gap: 12px;
}

.notice {
  border-radius: 12px;
  padding: 12px;
  text-align: center;
}

.notice p {
  margin: 0;
}

.notice small {
  color: #9eb2d6;
}

.notice.ok {
  background: rgba(138, 212, 255, 0.1);
  border: 1px solid rgba(138, 212, 255, 0.3);
  color: #8ad4ff;
}

.notice.warn {
  background: rgba(255, 170, 0, 0.1);
  border: 1px solid rgba(255, 170, 0, 0.3);
  color: #ffaa00;
}

.error {
  margin: 0;
  color: #ff8d9c;
  text-align: center;
}

.link {
  background: transparent;
  border: none;
  color: #9eb2d6;
  cursor: pointer;
}
</style>
