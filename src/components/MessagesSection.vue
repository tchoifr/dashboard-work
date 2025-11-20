<script setup>
defineProps({
  conversations: Array,
  thread: Array,
})
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
          <article v-for="conv in conversations" :key="conv.name" class="conversation">
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
          <input type="text" placeholder="Type a message..." />
          <button class="send">➤</button>
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
  color: #eaf1ff;
  font-size: 17px;
  font-weight: 700;
}

.panel {
  background: rgba(15, 25, 46, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35);
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
}

h3 {
  color: #dfe7f5;
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
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
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
  background: rgba(6, 12, 23, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 14px;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 10px 12px;
  color: #eaf1ff;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
}

.bubble-row.me .bubble {
  background: rgba(61, 199, 255, 0.16);
  border-color: rgba(61, 199, 255, 0.35);
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
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.04);
  color: #dfe7f5;
}

.send {
  height: 44px;
  width: 44px;
  border-radius: 12px;
  border: 1px solid rgba(61, 199, 255, 0.45);
  background: #0b5f96;
  color: #e8f7ff;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(61, 199, 255, 0.2);
}

@media (max-width: 960px) {
  .panel {
    grid-template-columns: 1fr;
  }
}
</style>
