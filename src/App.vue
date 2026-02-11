<script setup>
import { computed, onMounted } from "vue"
import AuthLanding from "./components/AuthLanding.vue"
import DashboardView from "./components/DashboardView.vue"
import { useAuthStore } from "./store/auth"

const auth = useAuthStore()
const isAuthenticated = computed(() => auth.isAuthenticated)

onMounted(() => {
  auth.restoreFromLocalStorage()
})

const handleConnected = (payload) => {
  // payload = { token, user }
  auth.token = payload.token
  auth.user = payload.user
}
</script>

<template>
  <main class="shell">
    <AuthLanding 
      v-if="!isAuthenticated" 
      @connected="handleConnected" 
    />

    <DashboardView 
      v-else
      :user="auth.user"
      :token="auth.token"
    />
  </main>
</template>

<style scoped>
.shell {
  min-height: 100vh;
}
</style>
