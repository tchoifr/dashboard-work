<script setup>
import { onMounted, computed } from "vue"
import { storeToRefs } from "pinia"
import { useConversationStore } from "@/store/conversations"
import MessagesSection from "@/components/MessagesSection.vue"
import { useAuthStore } from "@/store/auth"

const s = useConversationStore()
const auth = useAuthStore()

const { conversationPreviews, activeConversation, activeMessages } = storeToRefs(s)

const activeConversationUi = computed(() => {
  const c = activeConversation.value
  if (!c) return null

  const parts = Array.isArray(c.participants) ? c.participants : []
  const other =
    parts.find((p) => String(p.uuid) !== String(auth.userUuid)) ||
    parts[0] ||
    null

  return {
    ...c,
    name: other?.username || parts.map((p) => p.username).join(", ") || "Conversation",
  }
})

onMounted(async () => {
  console.log("MessagesView mounted")
  await s.fetchFriends()
  await s.fetchConversations()
})

</script>

<template>
  <MessagesSection
    :friends="s.friendOptions"
    :conversations="conversationPreviews"
    :activeConversation="activeConversationUi"
    :thread="activeMessages"
    :loadingConversations="s.loadingConversations"
    :loadingMessages="s.loadingMessages"
    :sendingMessage="s.sendingMessage"
    :deletingMessageIds="s.deletingMessageIds"
    @select-conversation="s.selectConversation"
    @send-message="s.sendMessage"
    @start-friend-chat="s.createPrivateConversation"
    @delete-conversation="s.deleteConversationLocal"
    @delete-message="s.deleteMessage"
  />
</template>
