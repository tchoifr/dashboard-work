<script setup>
defineProps({
  contracts: Array,
})
</script>

<template>
  <section class="contracts">
    <div class="panel-header">
      <h2>My Contracts</h2>
      <button class="primary-btn">
        <span class="plus">+</span>
        New Contract
      </button>
    </div>

    <div class="grid">
      <article v-for="contract in contracts" :key="contract.name" class="card">
        <div class="card-top">
          <div class="icon">
            <span class="doc">📄</span>
          </div>
          <div class="info">
            <h3>{{ contract.name }}</h3>
            <p class="muted">{{ contract.client }}</p>
          </div>
          <span class="badge" :class="contract.status">{{ contract.status }}</span>
        </div>

        <div class="meta">
          <div>
            <p class="label">Amount</p>
            <p class="value">{{ contract.amount }}</p>
          </div>
          <div>
            <p class="label">Period</p>
            <p class="value">{{ contract.period }}</p>
          </div>
        </div>

        <div class="cta-row">
          <button class="outline-btn">View</button>
          <button class="icon-btn" title="Download">
            ⬇
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.contracts {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

h2 {
  color: #eaf1ff;
  font-size: 17px;
  font-weight: 700;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(61, 199, 255, 0.35);
  background: #0b5f96;
  color: #e8f7ff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 25px rgba(61, 199, 255, 0.18);
  transition: transform 0.1s ease;
}

.primary-btn:hover {
  transform: translateY(-1px);
}

.plus {
  font-size: 16px;
  line-height: 1;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.card {
  background: rgba(15, 25, 46, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card-top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
}

.icon {
  height: 40px;
  width: 40px;
  border-radius: 12px;
  background: rgba(61, 199, 255, 0.14);
  display: grid;
  place-items: center;
}

.doc {
  font-size: 20px;
}

.info h3 {
  color: #e5edff;
  font-size: 15px;
  font-weight: 700;
}

.muted {
  color: #7c8da8;
  font-size: 13px;
}

.badge {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
  justify-self: end;
}

.badge.active {
  color: #0f7d46;
  background: rgba(54, 215, 132, 0.16);
  border: 1px solid rgba(54, 215, 132, 0.4);
}

.badge.signed {
  color: #0f7d46;
  background: rgba(64, 199, 126, 0.18);
  border: 1px solid rgba(44, 173, 105, 0.45);
}

.badge.pending {
  color: #c07a18;
  background: rgba(241, 174, 68, 0.15);
  border: 1px solid rgba(241, 174, 68, 0.5);
}

.meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.label {
  color: #6d7c92;
  font-size: 12px;
}

.value {
  color: #44b5ff;
  font-weight: 700;
}

.cta-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
}

.outline-btn {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(61, 199, 255, 0.5);
  background: rgba(61, 199, 255, 0.08);
  color: #bde8ff;
  font-weight: 700;
  cursor: pointer;
}

.icon-btn {
  height: 36px;
  width: 36px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: #bde8ff;
  cursor: pointer;
  font-size: 16px;
}

@media (max-width: 640px) {
  .cta-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
