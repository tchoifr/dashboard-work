<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  jobs: {
    type: Array,
    default: () => [],
  },
})

const search = ref('')

const filteredJobs = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return props.jobs
  return props.jobs.filter((job) => {
    const haystack = [
      job.title,
      job.company,
      job.location,
      job.budget,
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
          <span class="badge" :class="job.type">{{ job.type }}</span>
        </div>

        <div class="tags">
          <span v-for="tag in job.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>

        <div class="footer">
          <div class="budget">
            <p class="label">Budget</p>
            <p class="value">{{ job.budget }}</p>
          </div>
          <button class="apply-btn">Postuler</button>
        </div>
      </article>
    </div>
    <p v-else class="empty">Aucun job ne correspond a ta recherche.</p>
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
  color: #7ba7ff;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
  font-weight: 800;
}

h2 {
  color: #eaf1ff;
  font-size: 17px;
  font-weight: 700;
}

.search input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 12px;
  min-width: 240px;
  color: #e8f3ff;
}

.search input:focus {
  outline: none;
  border-color: rgba(61, 199, 255, 0.5);
  box-shadow: 0 0 0 1px rgba(61, 199, 255, 0.2);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
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
  gap: 12px;
}

.card-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
}

.icon {
  height: 44px;
  width: 44px;
  border-radius: 14px;
  background: rgba(61, 199, 255, 0.14);
  display: grid;
  place-items: center;
  font-size: 22px;
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

.badge {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
  justify-self: end;
}

.badge.full-time {
  color: #1f9dff;
  background: rgba(61, 199, 255, 0.15);
  border: 1px solid rgba(61, 199, 255, 0.45);
}

.badge.contract {
  color: #0f7d46;
  background: rgba(54, 215, 132, 0.16);
  border: 1px solid rgba(54, 215, 132, 0.4);
}

.badge.part-time {
  color: #9c7cfb;
  background: rgba(156, 124, 251, 0.16);
  border: 1px solid rgba(156, 124, 251, 0.45);
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
  border: 1px solid rgba(61, 199, 255, 0.4);
  background: rgba(61, 199, 255, 0.1);
  color: #bde8ff;
  font-weight: 700;
  cursor: pointer;
}

.empty {
  color: #7c8da8;
}

@media (max-width: 680px) {
  .footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
