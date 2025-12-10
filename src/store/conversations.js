import { defineStore } from "pinia"
import api from "../services/api"
import { useAuthStore } from "./auth"

const getCurrentUserId = () => useAuthStore().user?.uuid || null

// Normalisation d'un user
const normalizeUser = (payload) => {
  if (!payload || typeof payload !== "object") return null
  const user = payload.friend || payload.user || payload.partner || payload.profile || payload

  return {
    uuid: user.uuid || user.id || null,
    username: user.username || user.walletAddress || "Unknown user",
    walletAddress: user.walletAddress || "",
  }
}

const formatRelativeTime = (value) => {
  if (!value) return ""
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()

  const m = 60 * 1000
  const h = m * 60
  const d = h * 24

  if (diffMs < m) return "Just now"
  if (diffMs < h) return `${Math.floor(diffMs / m)}m ago`
  if (diffMs < d) return `${Math.floor(diffMs / h)}h ago`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

const formatTimeLabel = (value) => {
  if (!value) return ""
  const date = new Date(value)
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Transforme un message en bulle d'affichage
const toMessageBubble = (message) => {
  const currentUserId = getCurrentUserId()
  const sender = message.sender || {}
  const senderUuid = sender.uuid
  const from = senderUuid === currentUserId ? "me" : "client"

  return {
    id: message.id,
    messageId: message.id,
    from,
    author: from === "me" ? "You" : sender.username || sender.walletAddress || "Unknown",
    text: message.body,
    time: formatTimeLabel(message.createdAt),
    createdAt: message.createdAt,
  }
}

// Liste des participants
const extractParticipants = (conversation) => conversation?.participants || []

// Preview conversation dans la liste de gauche
const toConversationPreview = (conversation, currentUserId) => {
  const participants = extractParticipants(conversation).map((p) => normalizeUser(p))
  const counterpart = participants.find((u) => u.uuid !== currentUserId) || participants[0]

  const lastMessage = conversation.lastMessage
  const lastMessageLabel = lastMessage ? lastMessage.body : ""
  const lastMessageTime = lastMessage ? formatRelativeTime(lastMessage.createdAt) : ""

  return {
    id: conversation.id,
    name: counterpart?.username || "Conversation",
    lastMessage: lastMessageLabel || "No messages yet",
    lastMessageAt: lastMessageTime,
    unreadCount: 0, // gestion plus tard
    participants,
    raw: conversation,
  }
}

export const useConversationStore = defineStore("conversations", {
  state: () => ({
    friends: [],
    conversations: [],
    messagesByConversation: {},
    activeConversationId: null,
    loadingConversations: false,
    loadingMessages: false,
    sendingMessage: false,
  }),

  getters: {
    conversationList(state) {
      const uid = getCurrentUserId()
      return state.conversations.map((c) => toConversationPreview(c, uid))
    },

    activeConversation(state) {
      if (!state.activeConversationId) return null
      const uid = getCurrentUserId()
      const raw = state.conversations.find((c) => c.id === state.activeConversationId)
      return raw ? toConversationPreview(raw, uid) : null
    },

    activeThread(state) {
      return state.messagesByConversation[state.activeConversationId] || []
    },
  },

  actions: {
    reset() {
      this.friends = []
      this.conversations = []
      this.messagesByConversation = {}
      this.activeConversationId = null
    },

    // Fetch all conversations
    async fetchConversations() {
      this.loadingConversations = true
      try {
        const { data } = await api.get("/conversations")
        this.conversations = Array.isArray(data) ? data : []
      } catch (error) {
        console.error("Failed to load conversations", error)
      } finally {
        this.loadingConversations = false
      }
    },

    // Fetch messages for 1 conversation
    async fetchMessages(conversationId) {
      if (!conversationId) return
      this.loadingMessages = true

      try {
        const { data } = await api.get(`/conversations/${conversationId}/messages`)

        // BACK SYMFONY = { conversation: {...}, messages: [...] }
        const messages = data.messages || []

        this.messagesByConversation[conversationId] = messages.map((m) =>
          toMessageBubble(m)
        )
      } catch (error) {
        console.error("Failed to load messages", error)
        this.messagesByConversation[conversationId] = []
      } finally {
        this.loadingMessages = false
      }
    },

    // Click conversation
    async selectConversation(conversationOrId) {
      const id = typeof conversationOrId === "string" ? conversationOrId : conversationOrId.id
      if (!id) return

      this.activeConversationId = id
      await this.fetchMessages(id)
      await this.fetchConversations()
    },

    // Create private chat
    async createPrivateConversation(userId) {
      if (!userId) return null

      try {
        const { data } = await api.post("/conversations/private", { user_id: userId })

        if (data?.id && !this.conversations.some((c) => c.id === data.id)) {
          this.conversations.unshift(data)
        }

        if (data?.id) await this.selectConversation(data.id)

        return data
      } catch (error) {
        console.error("Failed to create conversation", error)
        throw error
      }
    },

    // Send message
    async sendMessage(body) {
      const conversationId = this.activeConversationId
      const trimmed = body?.trim()
      if (!conversationId || !trimmed) return

      this.sendingMessage = true
      try {
        const { data } = await api.post("/messages", {
          conversation_id: conversationId,
          body: trimmed,
        })

        const formatted = toMessageBubble(data)

        if (!this.messagesByConversation[conversationId]) {
          this.messagesByConversation[conversationId] = []
        }

        this.messagesByConversation[conversationId].push(formatted)

        await this.fetchConversations()
      } catch (error) {
        console.error("Failed to send message", error)
      } finally {
        this.sendingMessage = false
      }
    },
  },
})
