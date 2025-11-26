<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  cards: {
    type: Array,
    default: () => [],
  },
  disputes: {
    type: Array,
    default: () => [],
  },
  transactions: {
    type: Array,
    default: () => [],
  },
})

const decisions = ref({})

const disputesWithDecision = computed(() =>
  props.disputes.map((dispute) => ({
    ...dispute,
    decision: decisions.value[dispute.id] || null,
  }))
)

const approvedDisputes = computed(() => disputesWithDecision.value.filter((item) => item.decision === 'approved'))
const rejectedDisputes = computed(() => disputesWithDecision.value.filter((item) => item.decision === 'rejected'))
const pendingDisputes = computed(() => disputesWithDecision.value.filter((item) => !item.decision))

const visibleTransactions = computed(() => props.transactions)

const setDecision = (id, decision) => {
  const current = decisions.value[id]
  const nextDecision = current === decision ? null : decision
  decisions.value = { ...decisions.value, [id]: nextDecision }
  console.debug('Admin decision update', { disputeId: id, decision: nextDecision })
}
</script>

<template>
  <section class="admin">
    <header class="hero">
      <div>
        <p class="eyebrow">Admin</p>
        <h2>Monitoring DAO &amp; flux financiers</h2>
      </div>
      <p class="hero-note">Vue synthétique des litiges DAO et des transactions on-chain.</p>
    </header>

    <div class="summary-grid">
      <article v-for="card in cards" :key="card.title" class="summary-card">
        <p class="pill">{{ card.tag }}</p>
        <p class="value">{{ card.value }}</p>
        <p class="label">{{ card.title }}</p>
        <p class="muted">{{ card.subtext }}</p>
      </article>
    </div>

    <div class="panels">
      <article class="panel disputes">
        <header class="panel-header">
          <div>
            <p class="eyebrow">DAO disputes</p>
            <h3>Récapitulatif des litiges</h3>
          </div>
          <span class="count">{{ pendingDisputes.length }} dossiers</span>
        </header>

        <div class="table">
          <div class="table-head">
            <span>Contrat</span>
            <span>Client</span>
            <span>Montant</span>
            <span>Votes</span>
            <span>Statut</span>
            <span>Action</span>
          </div>
          <div class="table-body">
            <div v-for="item in pendingDisputes" :key="item.id" class="table-row">
              <div>
                <p class="title">{{ item.name }}</p>
                <p class="muted">{{ item.period }}</p>
              </div>
              <p class="client">{{ item.client }}</p>
              <p class="amount">{{ item.amount }}</p>
              <p class="votes">{{ item.votesFor }} / {{ item.totalVoters }}</p>
              <span class="status-chip">{{ item.status }}</span>
              <div class="decision-area">
                <p class="decision-state">
                  {{ item.decision === 'approved' ? 'Validé' : item.decision === 'rejected' ? 'Refusé' : 'En attente' }}
                </p>
                <div class="decision-actions">
                  <button
                    class="action-btn approve"
                    :class="{ active: item.decision === 'approved' }"
                    type="button"
                    @click="setDecision(item.id, 'approved')"
                  >
                    Valider
                  </button>
                  <button
                    class="action-btn reject"
                    :class="{ active: item.decision === 'rejected' }"
                    type="button"
                    @click="setDecision(item.id, 'rejected')"
                  >
                    Refuser
                  </button>
                </div>
              </div>
              <div class="detail-block">
                <div>
                  <p class="detail-label">Attendu</p>
                  <p class="detail-text">{{ item.expected }}</p>
                </div>
                <div>
                  <p class="detail-label">Livré</p>
                  <p class="detail-text">{{ item.delivered }}</p>
                </div>
              </div>
            </div>
            <p v-if="!pendingDisputes.length" class="empty-row">Aucun litige en attente de décision.</p>
          </div>
        </div>
      </article>

      <article class="panel transactions">
        <header class="panel-header">
          <div>
            <p class="eyebrow">Flux financiers</p>
            <h3>Transactions en temps réel</h3>
          </div>
          <span class="count">{{ transactions.length }} mouvements</span>
        </header>

        <div class="ledger-scroll">
          <ul class="ledger">
            <li v-for="tx in visibleTransactions" :key="tx.id" class="ledger-item">
              <div class="ledger-left">
                <span class="dot" />
                <div>
                  <p class="title">{{ tx.label }}</p>
                  <p class="muted">{{ tx.date }} · {{ tx.time }} · {{ tx.contract }}</p>
                  <p class="hash">Tx: {{ tx.txHash }}</p>
                  <p class="fee">5% plateforme: {{ tx.platformShare }}</p>
                </div>
              </div>
              <div class="ledger-right">
                <p class="amount">{{ tx.amount }}</p>
                <span class="status-pill" :class="tx.status">{{ tx.status }}</span>
              </div>
            </li>
          </ul>
        </div>
      </article>
    </div>

    <div class="decision-panels">
      <article class="decision-card">
        <header>
          <p class="eyebrow">Litiges validés</p>
          <h3>Décisions favorables</h3>
        </header>
        <ul class="decision-list">
          <li v-for="item in approvedDisputes" :key="`validated-${item.id}`">
            <p class="title">{{ item.name }}</p>
            <p class="muted">{{ item.client }} · {{ item.amount }}</p>
            <p class="detail-text">Livré: {{ item.delivered }}</p>
          </li>
          <li v-if="!approvedDisputes.length" class="empty">Aucun litige validé pour le moment.</li>
        </ul>
      </article>

      <article class="decision-card">
        <header>
          <p class="eyebrow">Litiges refusés</p>
          <h3>Décisions défavorables</h3>
        </header>
        <ul class="decision-list">
          <li v-for="item in rejectedDisputes" :key="`rejected-${item.id}`">
            <p class="title">{{ item.name }}</p>
            <p class="muted">{{ item.client }} · {{ item.amount }}</p>
            <p class="detail-text">Attendu: {{ item.expected }}</p>
          </li>
          <li v-if="!rejectedDisputes.length" class="empty">Aucun litige refusé pour le moment.</li>
        </ul>
      </article>
    </div>
  </section>
</template>

<style scoped>
.admin {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
}

.eyebrow {
  color: #8f9cb8;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
  font-weight: 800;
}

h2,
h3 {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-weight: 800;
}

h2 {
  font-size: 18px;
}

h3 {
  font-size: 16px;
}

.hero-note {
  color: #8f9cb8;
  font-size: 13px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.summary-card {
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 16px;
  padding: 16px;
  background: radial-gradient(circle at 15% 20%, rgba(120, 90, 255, 0.2), transparent 45%), rgba(7, 12, 24, 0.9);
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(120, 90, 255, 0.25);
}

.pill {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(120, 90, 255, 0.4);
  color: #dcd4ff;
  font-size: 10px;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
}

.value {
  font-size: 24px;
  font-weight: 800;
  color: #f5f5ff;
}

.label {
  color: #c2cdf1;
  font-weight: 600;
  margin-top: 4px;
}

.muted {
  color: #8f9cb8;
  font-size: 12px;
  margin-top: 2px;
}

.panels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 18px;
}

.panel {
  background: linear-gradient(160deg, rgba(8, 12, 24, 0.95), rgba(10, 17, 32, 0.92));
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 18px;
  padding: 18px;
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(120, 90, 255, 0.22);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}

.count {
  color: #cfd8f0;
  font-size: 13px;
  font-weight: 600;
}

.table {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 2fr 1.3fr 1fr 0.8fr 0.9fr 1.4fr;
  gap: 12px;
  align-items: center;
}

.table-head {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7c8db2;
  border-bottom: 1px solid rgba(120, 90, 255, 0.25);
  padding-bottom: 4px;
}

.table-body {
  max-height: 320px;
  overflow-y: auto;
  padding-right: 6px;
}

.table-body::-webkit-scrollbar,
.ledger-scroll::-webkit-scrollbar {
  width: 6px;
}

.table-body::-webkit-scrollbar-thumb,
.ledger-scroll::-webkit-scrollbar-thumb {
  background-image: linear-gradient(180deg, #6b1dff 0%, #2d82ff 100%);
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 0 10px rgba(45, 130, 255, 0.45),
    inset 0 0 6px rgba(255, 255, 255, 0.18);
}

.table-body::-webkit-scrollbar-track,
.ledger-scroll::-webkit-scrollbar-track {
  background: rgba(3, 5, 15, 0.85);
  border-radius: 999px;
}

.table-row {
  padding: 12px 0;
  border-bottom: 1px solid rgba(120, 90, 255, 0.15);
}

.empty-row {
  text-align: center;
  color: #8f9cb8;
  padding: 16px 0;
  font-size: 13px;
}

.detail-block {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  margin-top: 10px;
  padding: 12px;
  border: 1px solid rgba(120, 90, 255, 0.15);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
}

.detail-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7c8db2;
  margin-bottom: 4px;
}

.detail-text {
  color: #dfe7ff;
  font-size: 13px;
}

.title {
  color: #f0ecff;
  font-weight: 600;
  margin-bottom: 4px;
}

.client,
.votes {
  color: #d3ddff;
  font-weight: 600;
}

.amount {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-weight: 700;
}

.status-chip {
  justify-self: start;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(247, 121, 255, 0.35);
  color: #f779ff;
  font-size: 12px;
  font-weight: 700;
}

.decision-area {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.decision-state {
  color: #9fb0cc;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.decision-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.action-btn {
  padding: 6px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: #dfe7ff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn.approve:hover,
.action-btn.approve.active {
  background: rgba(101, 242, 198, 0.14);
  border-color: rgba(101, 242, 198, 0.45);
  color: #65f2c6;
}

.action-btn.reject:hover,
.action-btn.reject.active {
  background: rgba(255, 139, 167, 0.14);
  border-color: rgba(255, 139, 167, 0.45);
  color: #ff8ba7;
}

.ledger {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  margin: 0;
}

.ledger-scroll {
  max-height: 320px;
  overflow-y: auto;
  padding-right: 6px;
}

.ledger-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border: 1px solid rgba(120, 90, 255, 0.16);
  border-radius: 14px;
  padding: 14px 16px;
  background: rgba(7, 12, 24, 0.88);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
}

.ledger-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 6px;
  background: radial-gradient(circle, #6ecbff, #6a48ff);
  box-shadow: 0 0 12px rgba(110, 203, 255, 0.6);
}

.hash {
  font-size: 12px;
  color: #7c8db2;
}

.ledger-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.fee {
  font-size: 12px;
  color: #cfd8f0;
  margin-top: 4px;
}

.ledger-right .amount {
  font-size: 16px;
  font-weight: 700;
}

.ledger-right .amount {
  color: #6ecbff;
}

.status-pill {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
}

.status-pill.completed {
  color: #65f2c6;
  border: 1px solid rgba(101, 242, 198, 0.5);
  background: rgba(101, 242, 198, 0.12);
}

.status-pill.pending {
  color: #f5c16c;
  border: 1px solid rgba(245, 193, 108, 0.5);
  background: rgba(245, 193, 108, 0.12);
}

.decision-panels {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.decision-card {
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 16px;
  padding: 16px;
  background: linear-gradient(160deg, rgba(8, 12, 24, 0.92), rgba(10, 17, 32, 0.9));
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.35),
    0 0 18px rgba(120, 90, 255, 0.18);
}

.decision-card h3 {
  margin: 4px 0 12px;
}

.decision-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 240px;
  overflow-y: auto;
  padding-right: 6px;
}

.decision-list::-webkit-scrollbar {
  width: 6px;
}

.decision-list::-webkit-scrollbar-thumb {
  background-image: linear-gradient(180deg, #6b1dff 0%, #2d82ff 100%);
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.decision-list::-webkit-scrollbar-track {
  background: rgba(3, 5, 15, 0.85);
  border-radius: 999px;
}

.decision-list li {
  border: 1px solid rgba(120, 90, 255, 0.18);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
}

.decision-list .empty {
  border-style: dashed;
  text-align: center;
  color: #8f9cb8;
  font-size: 13px;
}

@media (max-width: 960px) {
  .table-head,
  .table-row {
    grid-template-columns: 1.6fr 1fr 0.9fr 0.8fr 0.8fr 1.2fr;
  }
}

@media (max-width: 720px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .ledger-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .ledger-right {
    align-items: flex-start;
  }
}
</style>
