<script setup>
import { ref } from 'vue'
import AuthLanding from './components/AuthLanding.vue'
import DashboardView from './components/DashboardView.vue'

const isAuthenticated = ref(false)

const goToDashboard = () => {
  isAuthenticated.value = true
}
</script>

<template>
  <main class="shell">
    <AuthLanding v-if="!isAuthenticated" @proceed="goToDashboard" />
    <DashboardView v-else />
  </main>
</template>

<style scoped>
.shell {
  min-height: 100vh;
}
</style>
