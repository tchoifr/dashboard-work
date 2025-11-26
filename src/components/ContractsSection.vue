<script setup>
import { jsPDF } from 'jspdf'

const props = defineProps({
  contracts: Array,
})

const emit = defineEmits(['create-contract', 'view-contract'])

const openContract = () => emit('create-contract')

const downloadContract = (contract) => {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(contract.name || 'Contract', 20, 20)
  doc.setFontSize(12)
  doc.text(`Client: ${contract.client || ''}`, 20, 35)
  doc.text(`Amount: ${contract.amount || ''}`, 20, 45)
  doc.text(`Period: ${contract.period || ''}`, 20, 55)
  doc.text(`Status: ${contract.status || ''}`, 20, 65)
  doc.save(`${contract.name || 'contract'}.pdf`)
}

const viewContract = (contract) => emit('view-contract', contract)
</script>

<template>
  <section class="contracts">
    <div class="panel-header">
      <h2>My Contracts</h2>
      <button class="primary-btn" type="button" @click="openContract">
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
          <button class="outline-btn" type="button" @click="viewContract(contract)">View</button>
          <button class="icon-btn" type="button" title="Download" @click="downloadContract(contract)">
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
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-size: 17px;
  font-weight: 800;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(120, 90, 255, 0.4);
  background: linear-gradient(90deg, #6a48ff, #00c6ff);
  color: #061227;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 12px 28px rgba(0, 102, 255, 0.25);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 32px rgba(0, 102, 255, 0.32);
}

.plus {
  font-size: 16px;
  line-height: 1;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(385px, 1fr));
  gap: 16px;
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
  background: linear-gradient(145deg, rgba(106, 72, 255, 0.2), rgba(0, 198, 255, 0.16));
  display: grid;
  place-items: center;
  border: 1px solid rgba(120, 90, 255, 0.4);
}

.doc {
  font-size: 20px;
}

.info h3 {
  color: #eae7ff;
  font-size: 15px;
  font-weight: 700;
}

.muted {
  color: #8f9cb8;
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
  color: #6ecbff;
  background: rgba(110, 203, 255, 0.14);
  border: 1px solid rgba(110, 203, 255, 0.5);
}

.badge.signed {
  color: #7bd38f;
  background: rgba(123, 211, 143, 0.18);
  border: 1px solid rgba(123, 211, 143, 0.45);
}

.badge.pending {
  color: #f3c26b;
  background: rgba(243, 194, 107, 0.16);
  border: 1px solid rgba(243, 194, 107, 0.45);
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
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-weight: 800;
  display: inline-block;
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
  border: 1px solid rgba(120, 90, 255, 0.4);
  background: rgba(120, 90, 255, 0.12);
  color: #e2dbff;
  font-weight: 700;
  cursor: pointer;
}

.icon-btn {
  height: 36px;
  width: 36px;
  border-radius: 10px;
  border: 1px solid rgba(120, 90, 255, 0.35);
  background: rgba(120, 90, 255, 0.12);
  color: #d6c7ff;
  cursor: pointer;
  font-size: 16px;
}

@media (max-width: 640px) {
  .cta-row {
    grid-template-columns: 1fr 1fr;
  }
  .grid{
        grid-template-columns: repeat(auto-fit, minmax(282px, 1fr));
  }
}
</style>
