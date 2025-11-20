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
  background: linear-gradient(160deg, rgba(8, 12, 24, 0.95), rgba(10, 17, 32, 0.92));
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 14px;
  padding: 14px;
  box-shadow:
    0 12px 26px rgba(0, 0, 0, 0.32),
    0 0 18px rgba(120, 90, 255, 0.2);
}

.eyebrow {
  color: #8f9cb8;
  font-size: 12px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

h2 {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-size: 20px;
  font-weight: 800;
}

.title {
  color: #d6def5;
  font-weight: 600;
}

.muted {
  color: #8f9cb8;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
  width: 100%;
}

.card {
  background: linear-gradient(160deg, rgba(8, 12, 24, 0.92), rgba(10, 17, 32, 0.9));
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 14px;
  padding: 14px;
  box-shadow:
    0 12px 26px rgba(0, 0, 0, 0.32),
    0 0 18px rgba(120, 90, 255, 0.2);
}

.span-2 {
  grid-column: span 2;
}

.card h3 {
  color: #eae7ff;
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
  background: rgba(120, 90, 255, 0.12);
  border: 1px solid rgba(120, 90, 255, 0.35);
  color: #e2dbff;
  padding: 6px 10px;
  border-radius: 10px;
  font-weight: 700;
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
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 10px;
  padding: 10px;
  background: rgba(7, 12, 24, 0.78);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.28);
}

.label {
  color: #eae7ff;
  font-weight: 700;
}

.link {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-weight: 800;
  display: inline-block;
}

.note {
  border: 1px dashed rgba(120, 90, 255, 0.35);
  border-radius: 12px;
  padding: 12px 14px;
  color: #b8c8e4;
  background: rgba(120, 90, 255, 0.08);
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
