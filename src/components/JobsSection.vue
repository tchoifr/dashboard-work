<script setup>
defineProps({
  jobs: Array,
})
</script>

<template>
  <section class="jobs">
    <div class="panel-header">
      <h2>Available Jobs</h2>
      <button class="primary-btn">
        <span class="plus">+</span>
        Post Job
      </button>
    </div>

    <div class="grid">
      <article v-for="job in jobs" :key="job.title" class="card">
        <div class="card-head">
          <div class="icon">🏢</div>
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
          <button class="apply-btn">{{ job.cta }}</button>
        </div>
      </article>
    </div>
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
  color: #44b5ff;
  font-weight: 700;
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

@media (max-width: 680px) {
  .footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
