// src/store/conversations.js
import { defineStore } from "pinia"
import { listFriends } from "../services/friendsApi"
import {
  createPrivateConversation as createPrivateConversationApi,
  listConversations,
  getConversationMessages,
} from "../services/conversationsApi"
import { createMessage, deleteMessage as deleteMessageApi } from "../services/messagesApi"
import { useAuthStore } from "./auth"

const normalizeId = (v) => String(v ?? "")
const normalizeFriend = (friend) => {
  const uuid = friend?.uuid ? String(friend.uuid) : ""
  const walletAddress =
    friend?.walletAddress ||
    friend?.wallet_address ||
    friend?.wallet ||
    null
  const label =
    friend?.label ||
    friend?.username ||
    friend?.name ||
    walletAddress ||
    "Unknown friend"

  return { uuid, walletAddress, label }
}

const formatTime = (date) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

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
    // ✅ évite d'aller chercher auth dans un getter
    myUuid: null,

    friends: [],
    conversations: [],
    messagesByConversation: {},
    activeConversationId: null,

    loadingFriends: false,
    loadingConversations: false,
    loadingMessages: false,
    sendingMessage: false,
    deletingMessageIds: new Set(),
  }),

  getters: {
    friendOptions: (state) =>
      state.friends
        .map((f) => normalizeFriend(f))
        .filter((f) => !!f.uuid),

    activeConversation(state) {
      const id = normalizeId(state.activeConversationId)
      if (!id) return null
      return state.conversations.find((c) => normalizeId(c.id) === id) || null
    },

    activeMessages(state) {
      return state.messagesByConversation[normalizeId(state.activeConversationId)] || []
    },

    // ✅ UI list : [{ id, name, lastMessage, time }]
    conversationPreviews(state) {
      const me = normalizeId(state.myUuid)

      return state.conversations.map((c) => {
        const id = normalizeId(c.id)
        const parts = Array.isArray(c.participants) ? c.participants : []

        const other =
          parts.find((p) => normalizeId(p.uuid) !== me) ||
          parts[0] ||
          null

        const name =
          other?.username ||
          parts.map((p) => p.username).join(", ") ||
          `Conversation #${id}`

        const lastMessage = c.lastMessage?.body || ""
        const time = c.lastMessage?.createdAt ? formatRelativeTime(c.lastMessage.createdAt) : ""

        return { id, name, lastMessage, time }
      })
    },

    // ✅ pour ton DashboardView
    conversationList() {
      return this.conversationPreviews
    },

    activeThread() {
      return this.activeMessages
    },

    // (optionnel) unread count (si tu n’as pas encore une logique côté API, ça reste à 0)
    totalUnread() {
      return 0
    },
  },

  actions: {
    setMyUuid(uuid) {
      this.myUuid = uuid ? String(uuid) : null
    },

    // ---------------- FRIENDS ----------------
    async fetchFriends() {
      const auth = useAuthStore()
      console.log("[fetchFriends] isLogged:", auth.isLogged, "token:", auth.token)

      if (!auth.token) return

      this.loadingFriends = true
      try {
        const data = await listFriends()
        this.friends = Array.isArray(data)
          ? data.map((friend) => normalizeFriend(friend)).filter((friend) => !!friend.uuid)
          : []
      } catch (e) {
        console.error("fetchFriends failed", e?.response?.status, e?.response?.data || e)
        this.friends = []
      } finally {
        this.loadingFriends = false
      }
    },

    // ---------------- CONVERSATIONS ----------------
    async fetchConversations() {
      const auth = useAuthStore()
      console.log("[fetchConversations] isLogged:", auth.isLogged, "token:", auth.token)

      if (!auth.token) return

      this.loadingConversations = true
      try {
        const data = await listConversations()
        this.conversations = Array.isArray(data) ? data : []
      } catch (e) {
        console.error("fetchConversations failed", e?.response?.status, e?.response?.data || e)
        this.conversations = []
      } finally {
        this.loadingConversations = false
      }
    },

    async createPrivateConversation(friendUuid) {
      const auth = useAuthStore()
      if (!auth.token) return

      try {
        const data = await createPrivateConversationApi(friendUuid)
        const id = normalizeId(data?.id)
        if (!id) throw new Error("Conversation id manquant")

        const exists = this.conversations.some((c) => normalizeId(c.id) === id)
        if (!exists) this.conversations.unshift(data)

        await this.selectConversation(id)
      } catch (e) {
        console.error("createPrivateConversation failed", e?.response?.status, e?.response?.data || e)
        alert("Impossible d’ouvrir la conversation")
      }
    },

    // ---------------- MESSAGES ----------------
    async selectConversation(conversationId) {
      const id = normalizeId(conversationId)
      this.activeConversationId = id
      await this.fetchMessages(id)
    },

    async fetchMessages(conversationId) {
      const auth = useAuthStore()
      if (!auth.token) return

      const id = normalizeId(conversationId)
      this.loadingMessages = true
      try {
        const data = await getConversationMessages(id)
        const arr = Array.isArray(data) ? data : []

        this.messagesByConversation[id] = arr.map((m) => ({
          id: m.id,
          text: m.body,
          author: m.sender?.username || "Unknown",
          fromMe: normalizeId(m.sender?.uuid) === normalizeId(auth.userUuid),
          time: m.createdAt ? formatTime(m.createdAt) : "",
          createdAt: m.createdAt,
          senderUuid: m.sender?.uuid,
        }))

        const last = arr[arr.length - 1]
        const conv = this.conversations.find((c) => normalizeId(c.id) === id)
        if (conv) {
          conv.lastMessage = last
            ? { id: last.id, body: last.body, createdAt: last.createdAt }
            : null
        }
      } catch (e) {
        console.error("fetchMessages failed", e?.response?.status, e?.response?.data || e)
        this.messagesByConversation[id] = []
      } finally {
        this.loadingMessages = false
      }
    },

    async sendMessage(body) {
      const auth = useAuthStore()
      if (!auth.token) return
      if (!this.activeConversationId) return

      const conversationId = normalizeId(this.activeConversationId)
      const content = String(body || "").trim()
      if (!content) return

      if (!this.messagesByConversation[conversationId]) {
        this.messagesByConversation[conversationId] = []
      }

      const tempId = `tmp_${Date.now()}`
      const optimistic = {
        id: tempId,
        text: content,
        author: "Moi",
        fromMe: true,
        time: formatTime(new Date()),
        createdAt: new Date().toISOString(),
        senderUuid: auth.userUuid,
        _optimistic: true,
      }
      this.messagesByConversation[conversationId].push(optimistic)

      this.sendingMessage = true
      try {
        const data = await createMessage({
          conversation_id: conversationId,
          body: content,
        })

        const real = {
          id: data.id,
          text: data.body,
          author: data.sender?.username || "Moi",
          fromMe: true,
          time: data.createdAt ? formatTime(data.createdAt) : formatTime(new Date()),
          createdAt: data.createdAt,
          senderUuid: data.sender?.uuid,
        }

        const arr = this.messagesByConversation[conversationId]
        const idx = arr.findIndex((m) => m.id === tempId)
        if (idx !== -1) arr[idx] = real
        else arr.push(real)

        const conv = this.conversations.find((c) => normalizeId(c.id) === conversationId)
        if (conv) conv.lastMessage = { id: data.id, body: data.body, createdAt: data.createdAt }
      } catch (e) {
        console.error("sendMessage failed", e?.response?.status, e?.response?.data || e)
        this.messagesByConversation[conversationId] =
          this.messagesByConversation[conversationId].filter((m) => m.id !== tempId)
      } finally {
        this.sendingMessage = false
      }
    },

    async deleteMessage(messageId) {
      const auth = useAuthStore()
      if (!auth.token) return
      if (!this.activeConversationId) return

      const id = normalizeId(messageId)
      if (!id) return

      this.deletingMessageIds.add(id)
      try {
        await deleteMessageApi(id)

        const convId = normalizeId(this.activeConversationId)
        const arr = this.messagesByConversation[convId] || []
        this.messagesByConversation[convId] = arr.filter((m) => normalizeId(m.id) !== id)

        const last = this.messagesByConversation[convId]?.slice(-1)[0] || null
        const conv = this.conversations.find((c) => normalizeId(c.id) === convId)
        if (conv) {
          conv.lastMessage = last
            ? { id: last.id, body: last.text, createdAt: last.createdAt }
            : null
        }
      } catch (e) {
        console.error("deleteMessage failed", e?.response?.status, e?.response?.data || e)
        alert("Impossible de supprimer le message")
      } finally {
        this.deletingMessageIds.delete(id)
      }
    },

    deleteConversationLocal(conversationId) {
      const id = normalizeId(conversationId)
      this.conversations = this.conversations.filter((c) => normalizeId(c.id) !== id)
      delete this.messagesByConversation[id]
      if (normalizeId(this.activeConversationId) === id) this.activeConversationId = null
    },

    reset() {
      this.myUuid = null
      this.friends = []
      this.conversations = []
      this.messagesByConversation = {}
      this.activeConversationId = null
      this.deletingMessageIds = new Set()
    },
  },
})
