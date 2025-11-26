<script setup>
defineProps({
  projects: Array,
  transactions: Array,
})
</script>

<template>
  <section class="content">
    <div class="panel">
      <div class="panel-header">
        <h2>Active Projects</h2>
      </div>
      <div class="projects">
        <article v-for="project in projects" :key="project.name" class="project-card">
          <div class="project-top">
            <div>
              <h3>{{ project.name }}</h3>
              <p class="muted">{{ project.client }}</p>
            </div>
            <span class="status" :class="project.status">{{ project.status }}</span>
          </div>
          <div class="project-meta">
            <div>
              <p class="meta-label">Amount</p>
              <p class="meta-value">{{ project.amount }}</p>
            </div>
            <div class="deadline">
              <p class="meta-label">Deadline</p>
              <p class="meta-value">{{ project.deadline }}</p>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <h2>Recent Transactions</h2>
      </div>
      <div class="transactions">
        <article v-for="transaction in transactions" :key="transaction.title" class="transaction">
          <div class="tx-main">
            <span class="tx-icon" :class="transaction.type" />
            <div>
              <p class="tx-title">{{ transaction.title }}</p>
              <p class="tx-date">{{ transaction.date }}</p>
            </div>
          </div>
          <div class="tx-meta">
            <p class="tx-amount" :class="transaction.type">{{ transaction.amount }}</p>
            <p class="tx-status">{{ transaction.status }}</p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.content {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 20px;
}

.panel {
  background: linear-gradient(160deg, rgba(8, 12, 24, 0.95), rgba(10, 17, 32, 0.92));
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 16px;
  padding: 18px;
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(120, 90, 255, 0.22);
}

.panel-header {
  margin-bottom: 14px;
}

.panel h2 {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-size: 16px;
  font-weight: 800;
}

.projects {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 6px;
}

.project-card {
  border: 1px solid rgba(120, 90, 255, 0.28);
  border-radius: 14px;
  padding: 14px;
  background: radial-gradient(circle at 20% 20%, rgba(120, 90, 255, 0.14), transparent 40%),
    rgba(8, 12, 24, 0.8);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.35);
}

.project-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 12px;
}

.project-card h3 {
  color: #eae7ff;
  font-weight: 700;
  font-size: 15px;
}

.muted {
  color: #8f9cb8;
  font-size: 13px;
  margin-top: 2px;
}

.status {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
}

.status.active {
  color: #6ecbff;
  background: rgba(110, 203, 255, 0.14);
  border: 1px solid rgba(110, 203, 255, 0.5);
}

.status.pending {
  color: #f3c26b;
  background: rgba(243, 194, 107, 0.16);
  border: 1px solid rgba(243, 194, 107, 0.45);
}

.status.completed {
  color: #7bd38f;
  background: rgba(123, 211, 143, 0.18);
  border: 1px solid rgba(123, 211, 143, 0.45);
}

.project-meta {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.meta-label {
  color: #6d7c92;
  font-size: 12px;
  margin-bottom: 4px;
}

.meta-value {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-weight: 800;
  display: inline-block;
}

.deadline .meta-value {
  color: #cfd8f0;
}

.transactions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 6px;
}

.transaction {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid rgba(120, 90, 255, 0.16);
  border-radius: 12px;
  padding: 12px 14px;
  background: rgba(7, 12, 24, 0.85);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.32);
}

.tx-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tx-icon {
  height: 32px;
  width: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 14px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25);
}

.tx-icon.in {
  background: rgba(156, 124, 251, 0.16);
  color: #c5a7ff;
}

.tx-icon.in::before {
  content: '↑';
}

.tx-icon.out {
  background: rgba(103, 202, 255, 0.16);
  color: #8ad4ff;
}

.tx-icon.out::before {
  content: '↓';
}

.tx-title {
  color: #e7eefe;
  font-weight: 600;
}

.tx-date {
  color: #6d7c92;
  font-size: 12px;
  margin-top: 2px;
}

.tx-meta {
  text-align: right;
}

.tx-amount {
  font-weight: 700;
}

.tx-amount.in {
  color: #c5a7ff;
}

.tx-amount.out {
  color: #8ad4ff;
}

.tx-status {
  color: #7c8da8;
  font-size: 12px;
}

@media (max-width: 1100px) {
  .content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .project-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .transaction {
    flex-direction: column;
    align-items: flex-start;
  }

  .tx-meta {
    text-align: left;
  }
}
</style>
