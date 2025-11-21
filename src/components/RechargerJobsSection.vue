<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  jobs: {
    type: Array,
    default: () => [],
  },
})

const search = ref('')

const statusClass = (status) => {
  if (!status) return ''
  const normalized = status.toLowerCase()
  if (normalized.includes('cours')) return 'en-cours'
  if (normalized.includes('attente')) return 'en-attente'
  if (normalized.includes('valid')) return 'valide'
  if (normalized.includes('litige')) return 'litige'
  return ''
}

const filteredJobs = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return props.jobs
  return props.jobs.filter((job) => {
    const haystack = [
      job.title,
      job.company,
      job.location,
      job.budget,
      job.status,
      ...(job.tags || []),
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(term)
  })
})
</script>

<template>
  <section class="jobs">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Find a job</p>
        <h2>Explorer et filtrer les jobs disponibles</h2>
      </div>
      <div class="search">
        <input v-model="search" type="search" placeholder="Rechercher par titre, stack ou client" />
      </div>
    </div>

    <div v-if="filteredJobs.length" class="grid">
      <article v-for="job in filteredJobs" :key="job.title + job.company" class="card">
        <div class="card-head">
          <div class="icon">💼</div>
          <div class="info">
            <h3>{{ job.title }}</h3>
            <p class="muted">{{ job.company }}</p>
            <p class="sub">
              <span class="dot">•</span> {{ job.location }}
              <span class="dot">•</span> {{ job.posted }}
            </p>
          </div>
          <div class="badges">
            <span class="badge" :class="job.type">{{ job.type }}</span>
            <span v-if="job.status" class="status-badge" :class="statusClass(job.status)">{{ job.status }}</span>
          </div>
        </div>

        <div class="tags">
          <span v-for="tag in job.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>

        <div class="footer">
          <div class="budget">
            <p class="label">Budget</p>
            <p class="value">{{ job.budget }}</p>
          </div>
          <div class="actions">
            <button class="apply-btn" type="button">Apply Now</button>
            <button
              v-if="job.status && statusClass(job.status) === 'en-cours'"
              class="dispute-btn"
              type="button"
            >
              Demander un litige
            </button>
          </div>
        </div>
      </article>
    </div>
    <p v-else class="empty">Aucun job ne correspond à ta recherche.</p>
  </section>
</template>

<style scoped>
.jobs {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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
  font-size: 17px;
  font-weight: 800;
}

.search input {
  background: rgba(8, 12, 24, 0.6);
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 12px;
  padding: 10px 12px;
  min-width: 240px;
  color: #e8f3ff;
}

.search input:focus {
  outline: none;
  border-color: rgba(120, 90, 255, 0.5);
  box-shadow: 0 0 0 1px rgba(120, 90, 255, 0.25);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
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
  gap: 12px;
}

.card-head {
  display: grid;
  gap: 15px;
  align-items: center;
}

.icon {
  height: 44px;
  width: 44px;
  border-radius: 14px;
  background: linear-gradient(145deg, rgba(106, 72, 255, 0.2), rgba(0, 198, 255, 0.16));
  display: grid;
  place-items: center;
  font-size: 22px;
  border: 1px solid rgba(120, 90, 255, 0.4);
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

.sub {
  color: #6d7c92;
  font-size: 12px;
}

.dot {
  color: #1f3d52;
  margin: 0 4px;
}

.badges {
  display: flex;
  gap: 6px;
}

.badge {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
  justify-self: end;
}

.badge.full-time {
  color: #6ecbff;
  background: rgba(110, 203, 255, 0.14);
  border: 1px solid rgba(110, 203, 255, 0.5);
}

.badge.contract {
  color: #7bd38f;
  background: rgba(123, 211, 143, 0.18);
  border: 1px solid rgba(123, 211, 143, 0.45);
}

.badge.part-time {
  color: #f3c26b;
  background: rgba(243, 194, 107, 0.16);
  border: 1px solid rgba(243, 194, 107, 0.45);
}

.status-badge {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  text-transform: capitalize;
  border: 1px solid transparent;
}

.status-badge.en-attente {
  color: #b5becf;
  background: rgba(181, 190, 207, 0.14);
  border-color: rgba(181, 190, 207, 0.4);
}

.status-badge.en-cours {
  color: #6ecbff;
  background: rgba(110, 203, 255, 0.14);
  border-color: rgba(110, 203, 255, 0.5);
}

.status-badge.valide {
  color: #7bd38f;
  background: rgba(123, 211, 143, 0.18);
  border-color: rgba(123, 211, 143, 0.45);
}

.status-badge.litige {
  color: #ff9a9a;
  background: rgba(255, 107, 107, 0.16);
  border-color: rgba(255, 107, 107, 0.55);
}

.tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #d8e7ff;
  font-size: 12px;
  font-weight: 600;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
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

.apply-btn {
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid rgba(120, 90, 255, 0.45);
  background: linear-gradient(90deg, rgba(106, 72, 255, 0.32), rgba(0, 198, 255, 0.32));
  color: #e9f2ff;
  font-weight: 800;
  cursor: pointer;
  box-shadow:
    0 12px 24px rgba(0, 102, 255, 0.2),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  transition: transform 0.1s ease, box-shadow 0.1s ease, border-color 0.1s ease;
}

.apply-btn:hover {
  transform: translateY(-1px);
  box-shadow:
    0 14px 32px rgba(0, 102, 255, 0.26),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.dispute-btn {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 107, 107, 0.55);
  background: rgba(255, 107, 107, 0.14);
  color: #ff9a9a;
  font-weight: 800;
  cursor: pointer;
}

.empty {
  color: #7c8da8;
}

@media (max-width: 680px) {
  .panel-header {
    align-items: flex-start;
  }

  .footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
