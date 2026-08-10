<template>
  <section class="panel schedule-panel-wrapper">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="color:#003B4F;margin:0;font-size:22px">Coves</h3>
      <q-btn v-if="admin" @click="openAddForm()" icon="add" label="Add new" flat class="add-cove-btn" title="Add cove" />
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
          <div class="schedule-day-input">
            <input v-model.number="scheduleDayOfWeek" type="number" min="0" max="6" />
            <span class="schedule-day-label">{{ getDayName(scheduleDayOfWeek) }}</span>
          </div>
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

    <form v-if="admin && showForm" @submit.prevent="editingId ? saveEdit() : addPlace()" class="admin-form" style="border: 1px solid #e0e0e0; padding: 12px; margin-bottom: 16px;">
      <label>
        Name
        <input v-model="name" placeholder="Enter place name" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #e6edf3; border-radius: 6px;" />
      </label>
      <label>
        Address
        <input v-model="address" placeholder="Enter address" style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #e6edf3; border-radius: 6px;" />
      </label>
      <label>
        Map link (optional)
        <input v-model="map" placeholder="https://..." style="width: 100%; padding: 8px; margin-top: 4px; border: 1px solid #e6edf3; border-radius: 6px;" />
      </label>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button type="submit" style="padding: 8px 12px; background-color: #1F3A5F; color: white; border: 0; border-radius: 6px; cursor: pointer; font-weight: 500;">{{ editingId ? 'Save changes' : 'Add cove' }}</button>
        <button v-if="editingId" type="button" @click="cancelEdit()" style="padding: 8px 12px; background-color: transparent; color: #666; border: 1px solid #ccc; border-radius: 6px; cursor: pointer;">Cancel</button>
      </div>
    </form>

    <ul style="list-style:none;padding:0;margin-top:12px">
      <li v-for="p in places" :key="p.id" class="panel" style="margin-bottom:8px">
        <div class="cove-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div class="cove-meta">
            <div class="cove-name" style="font-weight:700; font-size:22px">{{ p.name }}</div>
            <div class="cove-address" style="color:var(--muted); font-size:18px">{{ p.address }}</div>
          </div>
          <div class="cove-actions" style="display:flex;gap:8px;align-items:center">
            <a class="person-email" :href="p.map || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`" target="_blank" rel="noreferrer">Map</a>
            <q-btn v-if="admin" @click="startEdit(p)" icon="edit" flat dense style="color:#003B4F; border: 1px solid #003B4F; border-radius: 4px;" />
            <q-btn v-if="admin" @click="del(p.id)" icon="delete_outline" flat dense />
          </div>
        </div>
      </li>
    </ul>

    <q-btn flat dense icon="schedule" class="schedule-trigger" title="Schedule next event" @click="openSchedulePanel" />
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
type Place = { id: string; name: string; address: string; map?: string }
type ApiPlace = { placeId: number; name: string; address: string; link?: string }

const props = defineProps<{ admin?: boolean; showNotification?: (m:string,t?:'info'|'success'|'error')=>void }>()
const emit = defineEmits<{ (e: 'loaded', places: Place[]): void }>()
const admin = props.admin || false
const showNotification = props.showNotification

const places = ref<Place[]>([])
const name = ref('')
const address = ref('')
const map = ref('')
const showForm = ref(false)
const showSchedulePanel = ref(false)
const scheduleEnabled = ref(true)
const scheduleDayOfWeek = ref(0)
const scheduleHour = ref(0)
const scheduleMinute = ref(0)
const scheduleUpdatedBy = ref('admin-ui')
const editingId = ref<string | null>(null)
const API_BASE = (import.meta?.env?.VITE_API_BASE as string) || 'https://localhost:7079'
const PLACES_API_BASE = `${API_BASE}/api/admin/Places`

function mapApiToPlace(apiPlace: ApiPlace): Place {
  return {
    id: String(apiPlace.placeId),
    name: apiPlace.name,
    address: apiPlace.address,
    map: apiPlace.link || '',
  }
}

function getDayName(day: number): string {
  const normalizedDay = Number(day)
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return names[normalizedDay] || 'Unknown'
}

async function load() {
  try {
    const response = await fetch(`${PLACES_API_BASE}?t=${Date.now()}`, { cache: 'no-store' })
    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(errText || `HTTP ${response.status}`)
    }

    const data = await response.json()
    if (!Array.isArray(data)) {
      throw new Error('Invalid API response for places list')
    }

    const mappedPlaces = data.map(mapApiToPlace)
    places.value = mappedPlaces
    emit('loaded', mappedPlaces)
  } catch (e) {
    console.error('Places load error:', e)
    const errorMsg = e instanceof Error ? e.message : String(e)
    if (showNotification) showNotification(`Could not load places: ${errorMsg}`, 'error')
    places.value = []
  }
}

onMounted(() => {
  load()
})

async function addPlace() {
  if (!name.value.trim() || !address.value.trim()) { 
    if (showNotification) showNotification('Name and address required', 'error'); 
    return 
  }
  try {
    const response = await fetch(`${PLACES_API_BASE}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        name: name.value.trim(),
        address: address.value.trim(),
        link: map.value.trim(),
      }),
    })
    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(errText || `HTTP ${response.status}`)
    }

    await load()
    name.value = ''; address.value = ''; map.value = ''
    showForm.value = false
    if (showNotification) showNotification('Place added', 'success')
  } catch (e) { 
    console.error('Add place failed:', e)
    if (showNotification) showNotification('Add place failed: ' + String(e), 'error') 
  }
}

async function del(id: string) {
  if (!confirm('Delete this place?')) return
  try {
    const numericId = Number(id)
    if (!Number.isFinite(numericId)) {
      throw new Error('Invalid cove id')
    }

    const response = await fetch(`${PLACES_API_BASE}/delete/${numericId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(errText || `HTTP ${response.status}`)
    }

    await load()
    if (showNotification) showNotification('Place removed', 'success')
  } catch (e) {
    console.error('Delete place failed:', e)
    if (showNotification) showNotification('Delete failed', 'error')
  }
}

function openSchedulePanel() {
  const now = new Date()
  scheduleEnabled.value = true
  scheduleDayOfWeek.value = now.getDay()
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

    if (showNotification) showNotification('Schedule saved', 'success')
    showSchedulePanel.value = false
  } catch (e) {
    if (showNotification) showNotification(`Failed to save schedule: ${String((e as Error)?.message || e)}`, 'error')
  }
}

function openAddForm() {
  if (showForm.value) {
    cancelEdit()
    return
  }

  editingId.value = null
  name.value = ''
  address.value = ''
  map.value = ''
  showForm.value = true
}

function startEdit(place: Place) {
  editingId.value = place.id
  name.value = place.name
  address.value = place.address
  map.value = place.map || ''
  showForm.value = true
}

async function saveEdit() {
  if (!name.value.trim() || !address.value.trim()) {
    if (showNotification) showNotification('Name and address required', 'error')
    return
  }
  if (!editingId.value) return

  const id = editingId.value
  try {
    const response = await fetch(`${PLACES_API_BASE}/edit/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        name: name.value.trim(),
        address: address.value.trim(),
        link: map.value.trim(),
      }),
    })
    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(errText || `HTTP ${response.status}`)
    }

    await load()
    cancelEdit()
    if (showNotification) showNotification('Cove updated', 'success')
  } catch (e) {
    console.error('Edit place failed:', e)
    if (showNotification) showNotification('Failed to update cove', 'error')
  }
}

function cancelEdit() {
  editingId.value = null
  name.value = ''
  address.value = ''
  map.value = ''
  showForm.value = false
}
</script>

<style scoped>
.panel {
  background: linear-gradient(rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.78)), url('/banner.png');
  background-position: center;
  background-repeat: no-repeat;
  background-size: calc(100% - 4px) calc(100% - 4px);
}

.admin-form label { display:block; margin-bottom:8px }
.add-cove-btn { color: #003B4F; font-size: 1.1em; font-family: 'Pirata One', cursive; font-weight: 700; }

.schedule-panel-wrapper {
  position: relative;
}

.schedule-trigger {
  position: absolute;
  right: 10px;
  bottom: 10px;
  color: #003B4F;
  opacity: 0.75;
  z-index: 2;
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

.schedule-day-input {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #d8e1e8;
  border-radius: 6px;
  padding: 6px 8px;
  background: #fff;
}

.schedule-day-input input {
  border: 0;
  outline: none;
  padding: 0;
  width: 36px;
  background: transparent;
}

.schedule-day-label {
  font-size: 0.9em;
  color: #003B4F;
  font-weight: 600;
  white-space: nowrap;
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

.cove-row {
  flex-wrap: nowrap;
}

.cove-meta {
  min-width: 0;
  flex: 1;
}

.cove-name,
.cove-address {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cove-actions {
  flex-shrink: 0;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .cove-row {
    display: flex !important;
    align-items: center;
    gap: 6px;
  }

  .cove-actions {
    margin-left: auto;
  }
}
</style>
