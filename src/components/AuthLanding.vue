<script setup>
import { ref } from "vue"
import { useAuthStore } from "../store/auth"
import { connectPhantom, getPhantomProvider } from "../services/solana"

const auth = useAuthStore()
const emit = defineEmits(["connected"])
const mode = ref("login")
const username = ref("")
const status = ref("")

async function handleProceed() {
  try {
    status.value = "Connexion à Phantom..."
    const phantom = getPhantomProvider()
    if (!phantom) {
      alert("Installe ou active Phantom.")
      status.value = ""
      return
    }

    await connectPhantom()
    status.value = "Signature du message..."
    const res = await auth.loginWithWallet({
      username: mode.value === "register" ? username.value : null,
    })

    emit("connected", {
      token: res.token,
      user: res.user,
    })
  } catch (e) {
    console.error(e)
    alert("Connexion Phantom échouée. Voir console.")
  } finally {
    status.value = ""
  }
}
</script>

<template>
  <section class="auth">
    <div class="card">
      <div class="icon"><span>WORK</span></div>

      <h1>Connexion Solana</h1>
      <p class="lead">Connecte-toi ou crée un compte via Phantom.</p>

      <div v-if="mode === 'register'" class="form-group">
        <label>Nom d'utilisateur</label>
        <input type="text" v-model="username" placeholder="ex: Mina Chen" />
      </div>

      <button class="btn primary" @click="handleProceed">
        {{ mode === "login" ? "Connecter Phantom" : "Créer mon compte" }}
      </button>

      <p v-if="status" class="status">{{ status }}</p>

      <button class="link" v-if="mode === 'login'" @click="mode = 'register'">
        Créer un compte
      </button>

      <button class="link" v-if="mode === 'register'" @click="mode = 'login'">
        J'ai déjà un compte
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
  content: "";
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
  margin-bottom: 10px;
}

.form-group {
  width: 100%;
}

.form-group label {
  display: block;
  color: #cdd8f5;
  font-weight: 600;
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(120, 90, 255, 0.4);
  color: white;
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
  transition: 0.1s ease;
}

.btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 20px 40px rgba(0, 102, 255, 0.42);
}

.status {
  color: #8ad4ff;
  font-weight: 700;
  margin: 6px 0 0;
}

.link {
  background: transparent;
  border: none;
  color: #8ad4ff;
  font-weight: 700;
  cursor: pointer;
  margin-top: 4px;
}
.link:hover {
  color: #b4e4ff;
  text-decoration: underline;
}
</style>
