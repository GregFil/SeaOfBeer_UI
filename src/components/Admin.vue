<template>
  <section class="panel admin-panel">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px">
      <div class="tabs" style="display:flex;gap:8px">
        <q-btn :class="['tab-button', tab==='people'?'active':'']" @click="tab='people'" label="People" flat />
        <q-btn :class="['tab-button', tab==='places'?'active':'']" @click="tab='places'" label="Places" flat />
      </div>

      <q-btn
        flat
        dense
        icon="schedule"
        class="schedule-trigger"
        title="Schedule next event"
        @click="openSchedulePanel"
      />
    </div>

    <div v-if="showSchedulePanel" class="schedule-panel">
      <div class="schedule-title">Schedule next event</div>
      <div class="schedule-grid">
        <label class="schedule-field">
          <span>Enabled</span>
          <input v-model="scheduleEnabled" type="checkbox" />
        </label>
        <label class="schedule-field">
          <span>Day</span>
          <input v-model.number="scheduleDayOfWeek" type="number" min="0" max="6" />
        </label>
        <label class="schedule-field">
          <span>Hour</span>
          <input v-model.number="scheduleHour" type="number" min="0" max="23" />
        </label>
        <label class="schedule-field">
          <span>Minute</span>
          <input v-model.number="scheduleMinute" type="number" min="0" max="59" />
        </label>
        <label class="schedule-field schedule-field-wide">
          <span>Updated by</span>
          <input v-model="scheduleUpdatedBy" type="text" placeholder="admin-ui" />
        </label>
      </div>
      <div class="schedule-actions">
        <button type="button" class="schedule-save" @click="saveScheduleConfig">Save</button>
        <button type="button" class="schedule-cancel" @click="showSchedulePanel = false">Cancel</button>
      </div>
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
const showSchedulePanel = ref(false)
const scheduleEnabled = ref(true)
const scheduleDayOfWeek = ref(0)
const scheduleHour = ref(0)
const scheduleMinute = ref(0)
const scheduleUpdatedBy = ref('admin-ui')

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

function openSchedulePanel() {
  const now = new Date()
  const jsDay = now.getDay()
  scheduleEnabled.value = true
  scheduleDayOfWeek.value = jsDay === 0 ? 6 : jsDay - 1
  scheduleHour.value = now.getHours()
  scheduleMinute.value = now.getMinutes()
  scheduleUpdatedBy.value = 'admin-ui'
  showSchedulePanel.value = true
}

async function saveScheduleConfig() {
  try {
    const payload = {
      enabled: scheduleEnabled.value,
      dayOfWeek: Number(scheduleDayOfWeek.value),
      hour: Number(scheduleHour.value),
      minute: Number(scheduleMinute.value),
      updatedBy: (scheduleUpdatedBy.value || 'admin-ui').trim(),
    }

    const response = await fetch(`${API_BASE}/api/Schedule/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(text || 'Failed to save schedule config')
    }

    props.showNotification?.('Schedule saved', 'success')
    showSchedulePanel.value = false
  } catch (e) {
    props.showNotification?.(`Failed to save schedule: ${String((e as Error)?.message || e)}`, 'error')
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

.schedule-trigger {
  color: #003B4F;
  opacity: 0.75;
}

.schedule-panel {
  border: 1px solid #d8e1e8;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.78);
}

.schedule-title {
  font-weight: 700;
  color: #003B4F;
  margin-bottom: 8px;
}

.schedule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.schedule-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9em;
  color: #3f4a54;
}

.schedule-field-wide {
  grid-column: 1 / -1;
}

.schedule-field input {
  border: 1px solid #d8e1e8;
  border-radius: 6px;
  padding: 6px 8px;
}

.schedule-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.schedule-save,
.schedule-cancel {
  border: 1px solid #cbd5df;
  border-radius: 6px;
  padding: 7px 10px;
  cursor: pointer;
  background: #fff;
  color: #003B4F;
}

.schedule-save {
  background: #1F3A5F;
  color: white;
  border-color: #1F3A5F;
}
</style>
