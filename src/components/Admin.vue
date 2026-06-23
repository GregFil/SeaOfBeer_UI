<template>
  <section class="panel admin-panel">
    <div style="display:flex;gap:8px;margin-bottom:12px" class="tabs">
      <q-btn :class="['tab-button', tab==='people'?'active':'']" @click="tab='people'" label="People" flat />
      <q-btn :class="['tab-button', tab==='places'?'active':'']" @click="tab='places'" label="Places" flat />
    </div>

    <People v-if="tab === 'people'" :onAddPerson="onAddPerson" :existing="props.existing || []" :showNotification="showNotification" :onDeletePerson="onDeletePerson" :selectedEmails="selectedEmails" />
    <Places v-else :admin="true" :showNotification="showNotification" />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import People from './People.vue'
import Places from './Places.vue'

type Person = { name: string; email: string }

const props = defineProps<{ onAddPerson: (p:Person)=>void; existing?: Person[]; showNotification: (m:string,t?:'error'|'success'|'info')=>void; onDeletePerson: (email:string)=>void; selectedEmails?: string[]; selectedPlaces?: any[] }>()

const tab = ref<'people'|'places'>('people')
const API_BASE = (import.meta?.env?.VITE_API_BASE as string) || 'https://localhost:7079'

const selectedEmails = computed(() => props.selectedEmails || [])

let mounted = true

async function fetchSelectionData() {
  try {
    const r = await fetch(`${API_BASE}/api/selection/latest`)
    if (!r.ok) return
    const j = await r.json()
    // Selection data fetched but not used in this component
  } catch (e) {
    console.debug('Admin selection fetch error', e)
  }
}

onMounted(() => {
  mounted = true
  fetchSelectionData()
  const id = setInterval(fetchSelectionData, 15000)
  onUnmounted(() => { mounted = false; clearInterval(id) })
})

// Pass through props to child components
const onAddPerson = props.onAddPerson
const onDeletePerson = props.onDeletePerson
const showNotification = props.showNotification
</script>

<style scoped>
.admin-form label { display:block; margin-bottom:8px }
</style>
