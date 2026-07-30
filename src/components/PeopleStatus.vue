<template>
  <section class="panel">
    <h3 style="color:#003B4F">Crew</h3>
    <ul class="people-list" style="margin-top:12px">
      <li v-for="p in people" :key="p.email" class="person">
        <div style="display:flex;gap:12px;align-items:center">
          <div :class="{ 'responded-no': rsvps[p.email] === 'no' }" class="person-name">{{ p.name }}</div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
type Person = { name: string; email: string }
const props = defineProps<{ people: Person[] }>()
const rsvps = ref<Record<string,string>>({})
const RESPONSES_STORAGE_KEY = 'responses_v1'

let mounted = true

function loadResponses() {
  try {
    const stored = localStorage.getItem(RESPONSES_STORAGE_KEY)
    if (stored) {
      rsvps.value = JSON.parse(stored)
    }
  } catch (e) { 
    if (mounted) rsvps.value = {} 
  }
}

onMounted(() => { 
  mounted = true
  loadResponses()
  const id = setInterval(loadResponses, 2000)
  onUnmounted(() => { mounted = false; clearInterval(id) }) 
})
</script>

<style scoped>
.responded-no { text-decoration: line-through; color: var(--muted) }
</style>
