<script setup>
import { computed } from "vue"

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
  actionLoadingId: {
    type: [String, Number],
    default: null,
  },
  currentAdminUuid: {
    type: String,
    default: "",
  },
  admin1UserUuid: {
    type: String,
    default: "",
  },
  admin2UserUuid: {
    type: String,
    default: "",
  },
})

const emit = defineEmits(["open-dispute-contract", "decide-dispute"])
const pendingDisputes = computed(() =>
  (props.disputes || []).filter((item) => String(item?.status || "").toUpperCase() === "OPEN"),
)
const normalizeComparable = (value) => String(value || "").trim().toLowerCase()
const myVoteForDispute = (item) => {
  const backendMyVote = String(item?.myVote || "").toUpperCase()
  if (backendMyVote) return backendMyVote

  const me = normalizeComparable(props.currentAdminUuid)
  if (!me) return null
  const a1 = normalizeComparable(props.admin1UserUuid || item?.contract?.admin1UserUuid || item?.contract?.admin_1_user_uuid)
  const a2 = normalizeComparable(props.admin2UserUuid || item?.contract?.admin2UserUuid || item?.contract?.admin_2_user_uuid)
  if (me === a1) return String(item?.votes?.admin1 || "").toUpperCase() || null
  if (me === a2) return String(item?.votes?.admin2 || "").toUpperCase() || null
  return null
}
const isVoteLocked = (item) => !!myVoteForDispute(item)
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
                <button class="action-btn neutral" type="button" @click="emit('open-dispute-contract', item)">
                  Ouvrir contrat
                </button>
                <div class="decision-actions">
                  <button
                    class="action-btn approve"
                    :class="{ active: myVoteForDispute(item) === 'EMPLOYER' }"
                    type="button"
                    :disabled="String(props.actionLoadingId) === String(item.id) || isVoteLocked(item)"
                    @click="emit('decide-dispute', { disputeId: item.id, vote: 'EMPLOYER' })"
                  >
                    Employer
                  </button>
                  <button
                    class="action-btn approve"
                    :class="{ active: myVoteForDispute(item) === 'FREELANCER' }"
                    type="button"
                    :disabled="String(props.actionLoadingId) === String(item.id) || isVoteLocked(item)"
                    @click="emit('decide-dispute', { disputeId: item.id, vote: 'FREELANCER' })"
                  >
                    Freelancer
                  </button>
                  <button
                    class="action-btn approve"
                    :class="{ active: myVoteForDispute(item) === 'SPLIT' }"
                    type="button"
                    :disabled="String(props.actionLoadingId) === String(item.id) || isVoteLocked(item)"
                    @click="emit('decide-dispute', { disputeId: item.id, vote: 'SPLIT' })"
                  >
                    Split
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
  align-items: start;
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
  word-break: break-word;
}

.client,
.votes {
  color: #d3ddff;
  font-weight: 600;
  word-break: break-word;
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
  min-width: 0;
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

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.action-btn.neutral:hover {
  background: rgba(129, 171, 255, 0.16);
  border-color: rgba(129, 171, 255, 0.45);
  color: #c8dbff;
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
