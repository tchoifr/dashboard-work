<!-- src/components/MessageSection.vue -->
<script setup>
import { ref, computed } from "vue"
console.log("MessagesSection mounted")

const props = defineProps({
  // attendu: [{ id, name, lastMessage, time }]
  conversations: { type: Array, default: () => [] },

  // attendu: [{ id, text, author, fromMe, time }]
  thread: { type: Array, default: () => [] },

  activeConversation: { type: Object, default: null },

  // attendu: [{ value, label }] OU [{ uuid, username }]
  friends: { type: Array, default: () => [] },

  // UI states
  loadingConversations: { type: Boolean, default: false },
  loadingMessages: { type: Boolean, default: false },
  sendingMessage: { type: Boolean, default: false },

  // optionnel: Set/Array d'ids en suppression
  deletingMessageIds: { type: [Object, Array], default: () => new Set() },
})

const emit = defineEmits([
  "select-conversation",
  "send-message",
  "start-friend-chat",
  "delete-conversation",
  "delete-message",
])

const messageText = ref("")
const selectedFriend = ref("")

const activeId = computed(() => props.activeConversation?.id ?? null)

const friendOptions = computed(() =>
  (props.friends || []).map((friend) => ({
    value: friend.value ?? friend.uuid,
    label: friend.label ?? friend.username ?? friend.name ?? "Unknown friend",
  })),
)

const isDeletingMessage = (id) => {
  if (!id) return false
  if (props.deletingMessageIds instanceof Set) return props.deletingMessageIds.has(id)
  if (Array.isArray(props.deletingMessageIds)) return props.deletingMessageIds.includes(id)
  return false
}

function sendMessage() {
  const value = messageText.value.trim()
  if (!value || !activeId.value || props.sendingMessage) return
  emit("send-message", value)
  messageText.value = ""
}

function startFriendConversation() {
  if (!selectedFriend.value) return
  emit("start-friend-chat", selectedFriend.value)
  selectedFriend.value = ""
}

function askDeleteMessage(msg) {
  if (!msg?.fromMe) return
  if (!confirm("Supprimer ce message ?")) return
  emit("delete-message", msg.id)
}
</script>

<template>
  <section class="messages">
    <div class="panel">
      <!-- LEFT -->
      <aside class="conversations">
        <div class="panel-header">
          <h3>Conversations</h3>
          <small v-if="loadingConversations" class="hint">Chargement…</small>
        </div>

        <!-- NEW CHAT -->
        <form class="new-chat" @submit.prevent="startFriendConversation">
          <div class="select-shell">
            <select v-model="selectedFriend">
              <option disabled value="">Select a friend</option>
              <option
                v-for="friend in friendOptions"
                :key="friend.value"
                :value="friend.value"
              >
                {{ friend.label }}
              </option>
            </select>
          </div>
          <button class="pill" :disabled="!selectedFriend">New</button>
        </form>

        <!-- LIST -->
        <div v-if="!conversations.length && !loadingConversations" class="empty-state">
          Aucune conversation
        </div>

        <article
          v-for="conv in conversations"
          :key="conv.id"
          :class="['conversation', { active: String(conv.id) === String(activeId) }]"
        >
          <div class="conversation-main" @click="$emit('select-conversation', conv.id)">
            <strong class="name">{{ conv.name }}</strong>
            <small class="preview">{{ conv.lastMessage || "—" }}</small>
            <small v-if="conv.time" class="time">{{ conv.time }}</small>
          </div>

          <button
            class="delete"
            @click.stop="$emit('delete-conversation', conv.id)"
            title="Delete conversation"
            aria-label="Delete conversation"
          >
            🗑️
          </button>
        </article>
      </aside>

      <!-- RIGHT -->
      <main class="chat">
        <div class="chat-head">
          <div class="chat-title">
            <h3 v-if="activeConversation">{{ activeConversation?.name || "Conversation" }}</h3>
            <h3 v-else>Chat</h3>
            <small v-if="loadingMessages" class="hint">Chargement des messages…</small>
          </div>
        </div>

        <div v-if="thread.length" class="thread">
          <div
            v-for="msg in thread"
            :key="msg.id"
            :class="['bubble-row', { me: msg.fromMe }]"
          >
            <div :class="['bubble', { me: msg.fromMe }]">
              <div class="bubble-head">
                <strong class="author">{{ msg.author }}</strong>

                <button
                  v-if="msg.fromMe"
                  class="bubble-delete"
                  :disabled="isDeletingMessage(msg.id)"
                  @click="askDeleteMessage(msg)"
                  title="Supprimer"
                  aria-label="Supprimer le message"
                >
                  🗑️
                </button>
              </div>

              <p class="bubble-text">{{ msg.text }}</p>
              <small class="bubble-time">
                {{ msg.time }}
                <span v-if="isDeletingMessage(msg.id)"> · suppression…</span>
              </small>
            </div>
          </div>
        </div>

        <div v-else class="empty-thread">
          <span v-if="activeConversation && !loadingMessages">Aucun message</span>
          <span v-else>Select a conversation</span>
        </div>

        <div class="input-row">
          <input
            v-model="messageText"
            placeholder="Type a message"
            :disabled="!activeConversation || sendingMessage"
            @keyup.enter="sendMessage"
          />
          <button
            class="send"
            :disabled="!activeConversation || !messageText.trim() || sendingMessage"
            @click="sendMessage"
            title="Send"
            aria-label="Send"
          >
            ➤
          </button>
        </div>
      </main>
    </div>
  </section>
</template>

<style scoped>
.messages { display: flex; flex-direction: column; gap: 14px; }

.panel {
  background: linear-gradient(160deg, rgba(8, 12, 24, 0.95), rgba(10, 17, 32, 0.92));
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35), 0 0 18px rgba(120, 90, 255, 0.2);
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
}

.panel-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

h3 { color: #eae7ff; font-weight: 700; margin: 0; }
.hint { color: #8f9cb8; font-size: 12px; }

.new-chat {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-bottom: 12px;
}

.select-shell { position: relative; width: 100%; }
.select-shell::after {
  content: "↓";
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #d9c5ff;
  font-size: 15px;
  opacity: 0.85;
}

.select-shell select {
  border-radius: 12px;
  border: 1px solid rgba(120, 90, 255, 0.25);
  background: rgba(255, 255, 255, 0.03);
  color: #dfe7ff;
  padding: 8px 10px;
  padding-right: 34px;
  width: 100%;
  appearance: none;
}

.select-shell select option { background: #0a0f24; color: #eae7ff; }

.pill {
  border-radius: 12px;
  border: 1px solid rgba(120, 90, 255, 0.4);
  background: linear-gradient(90deg, #6a48ff, #00c6ff);
  color: #061227;
  font-weight: 700;
  padding: 8px 12px;
  cursor: pointer;
}
.pill:disabled { opacity: 0.5; cursor: not-allowed; }

.empty-state,
.empty-thread {
  color: #6d7c92;
  font-size: 13px;
  text-align: center;
  padding: 12px 0;
}

.conversation {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(120, 90, 255, 0.2);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  transition: border 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: start;
  margin-bottom: 10px;
}
.conversation:hover {
  border-color: rgba(120, 90, 255, 0.38);
  background: rgba(120, 90, 255, 0.12);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.32);
}
.conversation.active {
  border-color: rgba(120, 90, 255, 0.6);
  background: rgba(120, 90, 255, 0.16);
  box-shadow: 0 12px 22px rgba(106, 72, 255, 0.35);
}

.conversation-main { display: grid; gap: 4px; }
.name { color: #e7eefe; font-weight: 700; }
.preview { color: #8f9cb8; font-size: 13px; margin-top: 2px; }
.time { color: #6d7c92; font-size: 11px; margin-top: 2px; }

.delete {
  background: none;
  border: none;
  color: #f5b4d5;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 10px;
}
.delete:hover { background: rgba(255, 255, 255, 0.06); }

.chat { display: flex; flex-direction: column; gap: 12px; }
.chat-title { display: grid; gap: 4px; }

.thread {
  background: rgba(7, 12, 24, 0.85);
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 12px;
  padding: 14px;
  min-height: 260px;
  max-height: 480px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.32);
}

.bubble-row { display: flex; }
.bubble-row.me { justify-content: flex-end; }

.bubble {
  max-width: 72%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(120, 90, 255, 0.22);
  border-radius: 14px;
  padding: 10px 12px;
  color: #eaf1ff;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
}
.bubble.me { background: rgba(120, 90, 255, 0.15); border-color: rgba(120, 90, 255, 0.32); }

.bubble-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.author {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-weight: 800;
  font-size: 12px;
}

.bubble-text { margin: 0; white-space: pre-wrap; word-break: break-word; }

.bubble-time { display: block; color: #6d7c92; font-size: 11px; margin-top: 6px; }

.bubble-delete {
  background: none;
  border: none;
  color: #f5b4d5;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 10px;
}
.bubble-delete:hover { background: rgba(255, 255, 255, 0.06); }
.bubble-delete:disabled { opacity: 0.5; cursor: not-allowed; }

.input-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
}

input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(120, 90, 255, 0.25);
  background: rgba(255, 255, 255, 0.04);
  color: #dfe7f5;
}
input:disabled { opacity: 0.5; cursor: not-allowed; }

.send {
  height: 44px;
  width: 44px;
  border-radius: 12px;
  border: 1px solid rgba(120, 90, 255, 0.4);
  background: linear-gradient(90deg, #6a48ff, #00c6ff);
  color: #061227;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 12px 26px rgba(0, 102, 255, 0.28);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.send:hover { transform: translateY(-1px); box-shadow: 0 14px 30px rgba(0, 102, 255, 0.32); }
.send:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

@media (max-width: 960px) {
  .panel { grid-template-columns: 1fr; }
}
</style>
