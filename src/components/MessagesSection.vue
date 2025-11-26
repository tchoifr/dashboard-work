<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  conversations: Array,
  thread: Array,
  activeConversation: Object,
})

const emit = defineEmits(['select-conversation', 'send-message'])

const messageText = ref('')
const activeName = computed(() => props.activeConversation?.name)

const sendMessage = () => {
  const value = messageText.value.trim()
  if (!value || !props.activeConversation) return
  emit('send-message', value)
  messageText.value = ''
}

const chooseConversation = (conversation) => {
  emit('select-conversation', conversation)
}
</script>

<template>
  <section class="messages">
    <div class="panel-header">
      <h2>Messages</h2>
    </div>
    <div class="panel">
      <div class="conversations">
        <h3>Conversations</h3>
        <div class="list">
          <article
            v-for="conv in conversations"
            :key="conv.name"
            :class="['conversation', { active: conv.name === activeName }]"
            @click="chooseConversation(conv)"
            tabindex="0"
            @keyup.enter.prevent="chooseConversation(conv)"
          >
            <p class="name">{{ conv.name }}</p>
            <p class="time">{{ conv.lastMessage }}</p>
          </article>
        </div>
      </div>

      <div class="chat">
        <h3>Messages</h3>
        <div class="thread">
          <div v-for="msg in thread" :key="msg.id" :class="['bubble-row', msg.from]">
            <div class="bubble">
              <p class="author">{{ msg.author }}</p>
              <p>{{ msg.text }}</p>
              <span class="bubble-time">{{ msg.time }}</span>
            </div>
          </div>
        </div>
        <div class="input-row">
          <input
            v-model="messageText"
            type="text"
            placeholder="Type a message..."
            :disabled="!activeConversation"
            @keyup.enter.prevent="sendMessage"
          />
          <button class="send" :disabled="!activeConversation" @click="sendMessage">➤</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.messages {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-header h2 {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-size: 17px;
  font-weight: 800;
}

.panel {
  background: linear-gradient(160deg, rgba(8, 12, 24, 0.95), rgba(10, 17, 32, 0.92));
  border: 1px solid rgba(120, 90, 255, 0.25);
  border-radius: 14px;
  padding: 16px;
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.35),
    0 0 18px rgba(120, 90, 255, 0.2);
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
}

h3 {
  color: #eae7ff;
  font-weight: 700;
  margin-bottom: 10px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.conversation {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(120, 90, 255, 0.2);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  transition: border 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
}

.conversation:hover {
  border-color: rgba(120, 90, 255, 0.38);
  background: rgba(120, 90, 255, 0.12);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.32);
}

.conversation:focus-visible {
  outline: 2px solid rgba(110, 203, 255, 0.9);
  outline-offset: 3px;
}

.conversation.active {
  border-color: rgba(120, 90, 255, 0.6);
  background: rgba(120, 90, 255, 0.16);
  box-shadow: 0 12px 22px rgba(106, 72, 255, 0.35);
}

.name {
  color: #e7eefe;
  font-weight: 700;
}

.time {
  color: #6d7c92;
  font-size: 12px;
  margin-top: 2px;
}

.chat {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

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

.thread::-webkit-scrollbar {
  width: 8px;
}

.thread::-webkit-scrollbar-thumb {
  background-image: linear-gradient(180deg, #6b1dff 0%, #2d82ff 100%);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.bubble-row {
  display: flex;
}

.bubble-row.me {
  justify-content: flex-end;
}

.bubble {
  max-width: 72%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(120, 90, 255, 0.22);
  border-radius: 14px;
  padding: 10px 12px;
  color: #eaf1ff;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
}

.bubble-row.me .bubble {
  background: rgba(120, 90, 255, 0.15);
  border-color: rgba(120, 90, 255, 0.32);
}

.author {
  background: linear-gradient(90deg, #b77bff, #00c6ff);
  -webkit-background-clip: text;
  color: transparent;
  font-weight: 800;
  margin-bottom: 4px;
  font-size: 12px;
  display: inline-block;
}

.bubble-time {
  display: block;
  color: #6d7c92;
  font-size: 11px;
  margin-top: 6px;
}

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

input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

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

.send:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(0, 102, 255, 0.32);
}

.send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

@media (max-width: 960px) {
  .panel {
    grid-template-columns: 1fr;
  }
}
</style>
