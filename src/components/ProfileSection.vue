<script setup>
defineProps({
  profile: Object,
})
</script>

<template>
  <section class="profile-section">
    <div class="header-card">
      <div>
        <p class="eyebrow">Shareable Profile</p>
        <h2>{{ profile.name }}</h2>
        <p class="title">{{ profile.title }}</p>
        <p class="muted">{{ profile.location }}</p>
      </div>
    </div>

    <div class="grid">
      <article class="card span-2">
        <h3>Overview</h3>
        <p class="bio">{{ profile.bio }}</p>
        <div class="chips">
          <span class="chip">Rate: {{ profile.rate }}</span>
          <span class="chip">Availability: {{ profile.availability }}</span>
        </div>
      </article>

      <article class="card">
        <h3>Core Skills</h3>
        <div class="tags">
          <span v-for="skill in profile.skills" :key="skill" class="tag">{{ skill }}</span>
        </div>
      </article>

      <article class="card">
        <h3>Highlights</h3>
        <ul>
          <li v-for="item in profile.highlights" :key="item">{{ item }}</li>
        </ul>
      </article>

      <article class="card span-2">
        <h3>Portfolio</h3>
        <div class="portfolio">
          <div v-for="item in profile.portfolio" :key="item.label" class="portfolio-item">
            <p class="label">{{ item.label }}</p>
            <p class="muted">{{ item.tech }}</p>
            <a class="link" :href="item.link">View</a>
          </div>
        </div>
      </article>
    </div>

    <div class="note">
      <p>When you apply, your profile details are sent to the job poster. They can reply here to start a message thread immediately.</p>
    </div>
  </section>
</template>

<style scoped>
.profile-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: rgba(15, 25, 46, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.28);
}

.eyebrow {
  color: #7c8da8;
  font-size: 12px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

h2 {
  color: #eaf1ff;
  font-size: 20px;
  font-weight: 700;
}

.title {
  color: #c9d9f1;
  font-weight: 600;
}

.muted {
  color: #7c8da8;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
  width: 100%;
}

.card {
  background: rgba(15, 25, 46, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.28);
}

.span-2 {
  grid-column: span 2;
}

.card h3 {
  color: #dfe7f5;
  font-weight: 700;
  margin-bottom: 8px;
}

.bio {
  color: #c5d5ec;
  line-height: 1.6;
  margin-bottom: 10px;
}

.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  background: rgba(61, 199, 255, 0.12);
  border: 1px solid rgba(61, 199, 255, 0.3);
  color: #bde8ff;
  padding: 6px 10px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 13px;
}

.tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 7px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #dfe7f5;
  font-weight: 600;
  font-size: 13px;
}

ul {
  padding-left: 16px;
  color: #c5d5ec;
  display: grid;
  gap: 6px;
}

.portfolio {
  display: grid;
  gap: 10px;
}

.portfolio-item {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 10px;
  background: rgba(6, 12, 23, 0.6);
}

.label {
  color: #dfe7f5;
  font-weight: 700;
}

.link {
  color: #44b5ff;
  font-weight: 700;
}

.note {
  border: 1px dashed rgba(61, 199, 255, 0.4);
  border-radius: 12px;
  padding: 12px 14px;
  color: #b0c5e0;
  background: rgba(61, 199, 255, 0.06);
}

@media (max-width: 720px) {
  .header-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .span-2 {
    grid-column: span 1;
  }
}
</style>
