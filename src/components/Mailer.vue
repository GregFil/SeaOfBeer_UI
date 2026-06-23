<template>
  <section class="panel mailer-panel">
    <h2 style="color:#003B4F">Send invitation emails (via API)</h2>
    <div style="display:grid;gap:8px">
      <label>
        Organizer email
        <input v-model="organizer" placeholder="organizer@example.com" />
      </label>
      <label>
        Subject
        <input v-model="subject" />
      </label>
      <label>
        Message
        <textarea v-model="message" rows="4"></textarea>
      </label>
      <div>
        <q-btn @click="compose" class="pick-btn" label="Send via API" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
type Person = { name: string; email: string }
const props = defineProps<{ people: Person[]; organizerDefault?: string; subjectDefault?: string; showNotification?: (m:string,t?:'info'|'error'|'success')=>void }>()

const organizer = ref(props.organizerDefault || '')
const subject = ref(props.subjectDefault || 'Invitation')
const message = ref('Hello, please reply using the Yes/No links below.')
const API_BASE = (import.meta && (import.meta as any).env && (import.meta as any).env.VITE_API_BASE) || 'https://localhost:7079'

function compose() {
  if (!organizer.value) return props.showNotification ? props.showNotification('Provide organizer email', 'error') : alert('Provide organizer email')
  const recipients = props.people.map(p => p.email)
  fetch(`${API_BASE}/api/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizer: organizer.value, subject: subject.value, message: message.value, recipients })
  }).then(async (r) => {
    if (!r.ok) {
      const err = await r.json().catch(() => null)
      throw new Error(err && err.error ? err.error : 'Send failed')
    }
    return r.json()
  }).then(() => {
    if (props.showNotification) props.showNotification('Messages sent via API', 'success')
    else alert('Messages sent via API')
  }).catch((err) => {
    if (props.showNotification) props.showNotification('Send failed: ' + String(err), 'error')
    else alert('Send failed: ' + String(err))
  })
}
</script>
