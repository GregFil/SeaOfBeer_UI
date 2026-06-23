<template>
  <section class="panel">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="color:#003B4F;margin:0">Coves</h3>
      <q-btn v-if="admin" @click="showForm = !showForm" icon="add" label="Add new" flat class="add-cove-btn" title="Add cove" />
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
            <div class="cove-name" style="font-weight:700">{{ p.name }}</div>
            <div class="cove-address" style="color:var(--muted)">{{ p.address }}</div>
          </div>
          <div class="cove-actions" style="display:flex;gap:8px;align-items:center">
            <a class="person-email" :href="p.map || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`" target="_blank" rel="noreferrer">Map</a>
            <q-btn v-if="admin" @click="startEdit(p)" icon="edit" flat dense style="color:#003B4F; border: 1px solid #003B4F; border-radius: 4px;" />
            <q-btn v-if="admin" @click="del(p.id)" icon="delete_outline" flat dense />
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
type Place = { id: string; name: string; address: string; map?: string }
type ApiPlace = { placeId: number; name: string; address: string; link?: string }

const props = defineProps<{ admin?: boolean; showNotification?: (m:string,t?:'info'|'success'|'error')=>void }>()
const admin = props.admin || false
const showNotification = props.showNotification

const places = ref<Place[]>([])
const name = ref('')
const address = ref('')
const map = ref('')
const showForm = ref(false)
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

    places.value = data.map(mapApiToPlace)
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
    places.value = places.value.filter(p => p.id !== id)
    if (showNotification) showNotification('Place removed', 'success')
  } catch (e) { 
    console.error('Delete place failed:', e)
    if (showNotification) showNotification('Delete failed', 'error') 
  }
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
    const response = await fetch(`${PLACES_API_BASE}/${id}`, {
      method: 'PUT',
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
