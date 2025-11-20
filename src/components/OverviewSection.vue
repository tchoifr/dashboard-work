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
  background: rgba(15, 25, 46, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35);
}

.panel-header {
  margin-bottom: 14px;
}

.panel h2 {
  color: #eaf1ff;
  font-size: 16px;
  font-weight: 700;
}

.projects {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-card {
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 14px;
  background: radial-gradient(circle at 20% 20%, rgba(61, 199, 255, 0.06), transparent 40%),
    rgba(10, 17, 31, 0.75);
}

.project-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 12px;
}

.project-card h3 {
  color: #e5edff;
  font-weight: 700;
  font-size: 15px;
}

.muted {
  color: #7c8da8;
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
  color: #0f7d46;
  background: rgba(54, 215, 132, 0.16);
  border: 1px solid rgba(54, 215, 132, 0.4);
}

.status.pending {
  color: #c07a18;
  background: rgba(241, 174, 68, 0.15);
  border: 1px solid rgba(241, 174, 68, 0.5);
}

.status.completed {
  color: #0ea5e9;
  background: rgba(62, 198, 255, 0.16);
  border: 1px solid rgba(62, 198, 255, 0.45);
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
  color: #44b5ff;
  font-weight: 700;
}

.deadline .meta-value {
  color: #d6deef;
}

.transactions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.transaction {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px 14px;
  background: rgba(6, 12, 23, 0.8);
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
  background: rgba(60, 215, 132, 0.16);
  color: #2ed47a;
}

.tx-icon.in::before {
  content: '↓';
}

.tx-icon.out {
  background: rgba(127, 103, 255, 0.16);
  color: #9b8eff;
}

.tx-icon.out::before {
  content: '↑';
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
  color: #2ed47a;
}

.tx-amount.out {
  color: #f1b367;
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
