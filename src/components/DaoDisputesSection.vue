<script setup>
defineProps({
  disputes: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <section class="dao">
    <header class="panel-header">
      <div>
        <p class="eyebrow">DAO Governance</p>
        <h2>Litiges et arbitrage</h2>
      </div>
    </header>

    <div class="grid">
      <article
        v-for="contract in disputes.filter((c) => c.status && c.status.toLowerCase().includes('litige'))"
        :key="contract.name"
        class="card"
      >
        <div class="card-head">
          <div>
            <p class="label">Contrat</p>
            <h3>{{ contract.name }}</h3>
            <p class="muted">{{ contract.client }}</p>
          </div>
          <span class="badge">{{ contract.status }}</span>
        </div>

        <div class="sections">
          <div class="block">
            <p class="label">Ce qui devait être livré</p>
            <p class="text">{{ contract.expected }}</p>
          </div>
          <div class="block">
            <p class="label">Ce qui a été fourni</p>
            <p class="text">{{ contract.delivered }}</p>
          </div>
        </div>

        <div class="meta">
          <div>
            <p class="label">Montant</p>
            <p class="value">{{ contract.amount }}</p>
          </div>
          <div>
            <p class="label">Période</p>
            <p class="value">{{ contract.period }}</p>
          </div>
        </div>

        <div class="votes">
          <p class="label">Votes favorables</p>
          <p class="value">{{ contract.votesFor }} / {{ contract.totalVoters }}</p>
        </div>

        <div class="actions">
          <button class="btn approve" type="button">Vote favorable</button>
          <button class="btn reject" type="button">Vote défavorable</button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.dao {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.eyebrow {
  color: #8f9cb8;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
  font-weight: 800;
}

h2 {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-size: 18px;
  font-weight: 800;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}

.card {
  background: linear-gradient(160deg, rgba(8, 12, 24, 0.92), rgba(10, 17, 32, 0.9));
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 14px;
  padding: 16px;
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.32),
    0 0 18px rgba(120, 90, 255, 0.2);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.label {
  color: #6d7c92;
  font-size: 12px;
}

h3 {
  color: #eae7ff;
  font-size: 16px;
  font-weight: 700;
}

.muted {
  color: #8f9cb8;
  font-size: 13px;
}

.badge {
  align-self: start;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(120, 90, 255, 0.4);
  background: rgba(120, 90, 255, 0.12);
  color: #dcd4ff;
  font-weight: 700;
  text-transform: capitalize;
}

.sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.block {
  border: 1px solid rgba(120, 90, 255, 0.2);
  border-radius: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.02);
}

.text {
  color: #c5d5ec;
}

.meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.value {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-weight: 800;
  display: inline-block;
}

.votes {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 14px;
  border-radius: 12px;
  font-weight: 800;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.1s ease, box-shadow 0.1s ease, border-color 0.1s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn.approve {
  background: rgba(123, 211, 143, 0.16);
  border-color: rgba(123, 211, 143, 0.45);
  color: #7bd38f;
}

.btn.approve:hover {
  box-shadow: 0 12px 24px rgba(123, 211, 143, 0.24);
}

.btn.reject {
  background: rgba(243, 194, 107, 0.16);
  border-color: rgba(243, 194, 107, 0.45);
  color: #f3c26b;
}

.btn.reject:hover {
  box-shadow: 0 12px 24px rgba(243, 194, 107, 0.28);
}

@media (max-width: 680px) {
  .card-head {
    flex-direction: column;
  }
}
</style>
