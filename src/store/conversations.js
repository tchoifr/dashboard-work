import { defineStore } from "pinia"
import api from "../services/api"
import { useAuthStore } from "./auth"

const normalizeId = (v) => String(v ?? "")

const formatTime = (date) =>
  new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

const formatRelativeTime = (date) => {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "à l’instant"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  return `${Math.floor(hours / 24)} j`
}

export const useConversationStore = defineStore("conversations", {
  state: () => ({
    friends: [],
    conversations: [],
    messagesByConversation: {},
    activeConversationId: null,

    loadingFriends: false,
    loadingConversations: false,
    loadingMessages: false,
    sendingMessage: false,
  }),

  getters: {
    friendOptions: (state) =>
      state.friends.map((f) => ({
        label: f.username,
        value: f.uuid,
        walletAddress: f.walletAddress || f.wallet_address || null,
      })),

    activeConversation(state) {
      return state.conversations.find(
        (c) => normalizeId(c.id) === normalizeId(state.activeConversationId),
      )
    },

    activeMessages(state) {
      return (
        state.messagesByConversation[normalizeId(state.activeConversationId)] ||
        []
      )
    },

    conversationPreviews(state) {
      return state.conversations.map((c) => ({
        id: normalizeId(c.id),
        title: c.participants.map((p) => p.username).join(", "),
        lastMessage: c.lastMessage?.body || "",
        time: c.lastMessage
          ? formatRelativeTime(c.lastMessage.createdAt)
          : "",
      }))
    },
  },

  actions: {
    // ---------------- FRIENDS ----------------
    async fetchFriends() {
      const auth = useAuthStore()
      if (!auth.isLogged) return

      this.loadingFriends = true
      try {
        const { data } = await api.get("/friends")
        this.friends = Array.isArray(data) ? data : []
      } catch (e) {
        console.error("fetchFriends failed", e)
        this.friends = []
      } finally {
        this.loadingFriends = false
      }
    },

    // ---------------- CONVERSATIONS ----------------
    async fetchConversations() {
      const auth = useAuthStore()
      if (!auth.isLogged) return

      this.loadingConversations = true
      try {
        const { data } = await api.get("/conversations")
        this.conversations = Array.isArray(data) ? data : []
      } catch (e) {
        console.error("fetchConversations failed", e)
        this.conversations = []
      } finally {
        this.loadingConversations = false
      }
    },

    async createPrivateConversation(friendUuid) {
      const auth = useAuthStore()
      if (!auth.isLogged) return

      try {
        const { data } = await api.post("/conversations/private", {
          user_id: friendUuid,
        })

        const id = normalizeId(data.id)
        if (!id) throw new Error("Conversation id manquant")

        if (!this.conversations.find((c) => normalizeId(c.id) === id)) {
          this.conversations.unshift(data)
        }

        await this.selectConversation(id)
      } catch (e) {
        console.error("createPrivateConversation failed", e)
        alert("Impossible d’ouvrir la conversation")
      }
    },

    // ---------------- MESSAGES ----------------
    async selectConversation(conversationId) {
      this.activeConversationId = normalizeId(conversationId)
      await this.fetchMessages(conversationId)
    },

    async fetchMessages(conversationId) {
      const auth = useAuthStore()
      if (!auth.isLogged) return

      this.loadingMessages = true
      try {
        const { data } = await api.get(
          `/conversations/${conversationId}/messages`,
        )

        this.messagesByConversation[normalizeId(conversationId)] =
          Array.isArray(data)
            ? data.map((m) => ({
                id: m.id,
                text: m.body,
                author: m.sender.username,
                fromMe: m.sender.uuid === auth.userUuid,
                time: formatTime(m.createdAt),
              }))
            : []
      } catch (e) {
        console.error("fetchMessages failed", e)
      } finally {
        this.loadingMessages = false
      }
    },

    async sendMessage(body) {
      if (!this.activeConversationId) return

      this.sendingMessage = true
      try {
        const { data } = await api.post("/messages", {
          conversation_id: this.activeConversationId,
          body,
        })

        this.activeMessages.push({
          id: data.id,
          text: data.body,
          author: data.sender.username,
          fromMe: true,
          time: formatTime(data.createdAt),
        })
      } catch (e) {
        console.error("sendMessage failed", e)
      } finally {
        this.sendingMessage = false
      }
    },

    reset() {
      this.friends = []
      this.conversations = []
      this.messagesByConversation = {}
      this.activeConversationId = null
    },
  },
})
