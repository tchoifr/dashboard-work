<script setup>
const emit = defineEmits(['proceed'])

const handleProceed = () => {
  emit('proceed')
}
</script>

<template>
  <section class="auth">
    <div class="card">
      <div class="icon">
        <span>WORK</span>
      </div>
      <h1>Connexion Web3</h1>
      <p class="lead">Connecte-toi ou cree un compte via ton wallet decentralise.</p>
      <button class="btn primary" type="button" @click="handleProceed">Connecter mon wallet</button>
      <button class="link" type="button" @click="handleProceed">Creer un compte</button>
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
  background: linear-gradient(140deg, rgba(10, 28, 42, 0.95), rgba(12, 34, 58, 0.94));
  border: 1px solid rgba(61, 199, 255, 0.28);
  box-shadow:
    0 20px 48px rgba(0, 0, 0, 0.35),
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
  background: radial-gradient(circle, rgba(61, 199, 255, 0.12), transparent 55%);
  pointer-events: none;
}

.icon {
  height: 92px;
  width: 92px;
  border-radius: 18px;
  background: radial-gradient(circle at 50% 20%, rgba(61, 199, 255, 0.55), rgba(8, 17, 30, 0.9)),
    linear-gradient(145deg, #0c1f35, #0c2542);
  display: grid;
  place-items: center;
  border: 1px solid rgba(61, 199, 255, 0.35);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4), 0 0 18px rgba(61, 199, 255, 0.36);
}

.icon span {
  color: #e8f5ff;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  color: #6cd5ff;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.lead {
  color: #b5c9e9;
  text-align: center;
}

.btn.primary {
  background: linear-gradient(90deg, #6a48ff, #00c6ff);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #071121;
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
  color: #6ac3ff;
  font-weight: 700;
  cursor: pointer;
}
.link:hover {
  color: #8ed7ff;
  text-decoration: underline;
}
</style>
