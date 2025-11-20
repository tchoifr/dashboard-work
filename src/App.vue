<script setup>
import { ref } from 'vue'
import OverviewSection from './components/OverviewSection.vue'
import ContractsSection from './components/ContractsSection.vue'
import JobsSection from './components/JobsSection.vue'
import MessagesSection from './components/MessagesSection.vue'
import ProfileSection from './components/ProfileSection.vue'
import {
  summaryCards,
  overviewData,
  contractData,
  jobData,
  messagesData,
  profileData,
} from './store/dashboardData'

const tabs = ['Overview', 'Contracts', 'Jobs', 'Messages', 'Profile']
const activeTab = ref('Overview')

const setTab = (tab) => {
  activeTab.value = tab
}
</script>

<template>
  <div class="page">
    <header class="top-bar">
      <div class="brand">
        <p class="brand-title">
          Web3 <span class="accent">Freelance</span>
        </p>
        <p class="subtitle">Global crypto dashboard</p>
      </div>
      <div class="profile">JD</div>
    </header>

    <section class="metrics">
      <article v-for="card in summaryCards" :key="card.title" class="metric-card">
        <div class="metric-top">
          <p class="metric-label">{{ card.title }}</p>
          <div class="metric-icon" :data-icon="card.icon" />
        </div>
        <p class="metric-value">{{ card.value }}</p>
        <p class="metric-change" :class="card.trend">{{ card.change }}</p>
      </article>
    </section>

    <nav class="tabs">
      <button v-for="tab in tabs" :key="tab" :class="['tab', { active: tab === activeTab }]" @click="setTab(tab)">
        {{ tab }}
      </button>
    </nav>

    <OverviewSection
      v-if="activeTab === 'Overview'"
      :projects="overviewData.projects"
      :transactions="overviewData.transactions"
    />
    <ContractsSection v-else-if="activeTab === 'Contracts'" :contracts="contractData" />
    <JobsSection v-else-if="activeTab === 'Jobs'" :jobs="jobData" />
    <MessagesSection
      v-else-if="activeTab === 'Messages'"
      :conversations="messagesData.conversations"
      :thread="messagesData.thread"
    />
    <ProfileSection v-else :profile="profileData" />
  </div>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto 48px;
  padding: 8px;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.brand-title {
  font-size: 20px;
  font-weight: 700;
  color: #e9f2ff;
}

.accent {
  color: #3dc7ff;
}

.subtitle {
  color: #7c8da8;
  font-size: 13px;
  margin-top: 2px;
}

.profile {
  height: 40px;
  width: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1f3246, #2f4f6c);
  display: grid;
  place-items: center;
  color: #e9f2ff;
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.metric-card {
  background: linear-gradient(135deg, #0f192e, #0e2841);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 14px;
  padding: 18px 18px 16px;
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.metric-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.metric-label {
  color: #8fa1ba;
  font-size: 13px;
}

.metric-icon {
  height: 32px;
  width: 32px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  position: relative;
}

.metric-icon::before {
  content: attr(data-icon);
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #8ac8ff;
  font-size: 11px;
  text-transform: capitalize;
}

.metric-value {
  color: #f1f5ff;
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 6px;
  letter-spacing: 0.3px;
}

.metric-change {
  font-size: 12px;
}

.metric-change.up {
  color: #34e5a6;
}

.tabs {
  display: flex;
  gap: 10px;
  margin: 12px 0 22px;
}

.tab {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #92a3c3;
  padding: 8px 16px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab:hover {
  color: #d0def8;
  border-color: rgba(255, 255, 255, 0.12);
}

.tab.active {
  color: #e6f7ff;
  background: rgba(61, 199, 255, 0.16);
  border-color: rgba(61, 199, 255, 0.4);
}

@media (max-width: 720px) {
  .page {
    padding: 0;
  }

  .metrics {
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  }
}
</style>
