<template>
  <div class="panel" style="margin-bottom:12px; background: linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)), url('/banner.png'); background-position:center; background-repeat:no-repeat; background-size:calc(100% - 4px) calc(100% - 4px);">
    <div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:12px">
      <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:200px">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:2em;font-weight:bold;color:#003B4F;justify-content:space-between">
          <div style="display:flex;gap:12px;align-items:center">
            <span>Beer Captain:</span>
            <span>{{ displayName }}</span>
          </div>
          <q-btn v-if="isCaptainView && tokenValid" :disable="readOnly" @click="openPlacesModal" icon="touch_app" label="Select Cove" flat style="color:#003B4F; font-family:'Pirata One',cursive; font-weight:700; font-size:1.1em; white-space:nowrap" />
        </div>

        <div style="margin-top:12px;width:100%">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          </div>
        </div>

        <!-- Modal for selecting place -->
        <q-dialog v-model="showModal">
          <q-card style="min-width:500px;max-width:800px">
            <q-card-section>
              <div style="font-size:1.2em;font-weight:bold;color:#003B4F">Select a Cove</div>
            </q-card-section>
            <q-separator />
            <q-card-section style="max-height:60vh;overflow-y:auto">
              <div v-if="placesToShow.length === 0" style="text-align:center;color:#999">No coves available</div>
              <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px">
                <li v-for="place in placesToShow" :key="place.id" @click="selectPlaceFromModal(place)" :style="{ padding:'12px', background:'#f5f5f5', borderRadius:'6px', cursor: readOnly ? 'not-allowed' : 'pointer', transition:'background 0.2s', opacity: readOnly ? 0.7 : 1 }" @mouseenter="readOnly ? null : ($event.target.style.background='#e8e8e8')" @mouseleave="$event.target.style.background='#f5f5f5'">
                  <div style="font-weight:600;color:#003B4F">{{ place.name }}</div>
                  <div style="font-size:0.9em;color:#666">{{ place.address }}</div>
                </li>
              </ul>
            </q-card-section>
          </q-card>
        </q-dialog>

        <!-- Modal for selecting time -->
        <q-dialog v-model="showTimeModal">
          <q-card style="min-width:400px;max-width:600px">
            <q-card-section>
              <div style="font-size:1.2em;font-weight:bold;color:#003B4F">Select Meet Time</div>
              <div style="font-size:0.95em;color:#666;margin-top:8px">Choose when to meet at {{ pendingPlace?.name }}</div>
            </q-card-section>
            <q-separator />
            <q-card-section style="max-height:60vh;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px">
              <button v-for="time in timeOptions" :key="time" :disabled="readOnly" @click="confirmTime(time)" style="padding:12px;background:#f5f5f5;border:2px solid transparent;border-radius:6px;cursor:pointer;transition:all 0.2s;font-weight:600;color:#003B4F" :style="selectedTime === time ? {background:'#21ba45', color:'white', borderColor:'#21ba45'} : {}" @mouseenter="e => (e.target as HTMLElement).style.background = selectedTime === time ? '#21ba45' : '#e8e8e8'" @mouseleave="e => (e.target as HTMLElement).style.background = selectedTime === time ? '#21ba45' : '#f5f5f5'">
                {{ formatTimeWithAmPm(time) }}
              </button>
            </q-card-section>
            <q-separator />
            <q-card-section style="text-align:right;gap:8px;display:flex;justify-content:flex-end">
              <q-btn label="Cancel" color="grey-8" text-color="black" @click="showTimeModal = false" flat />
            </q-card-section>
          </q-card>
        </q-dialog>
      </div>

      <!-- <div style="display:flex;align-items:center;gap:8px">
        <strong>Handy cove:</strong>
        <div>
          <div style="font-size:0.9em;color:#666">Choose place from the banner below</div>
        </div>
      </div> -->
    </div>
  </div>

  <!-- panel below winner banner showing selected place details -->
  <div v-if="selectedPlace && selectedPlace.place" class="panel" style="margin-top:8px; background: linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)), url('/banner.png'); background-position:center; background-repeat:no-repeat; background-size:calc(100% - 4px) calc(100% - 4px);">
    <h4 style="color:#003B4F; margin:0 0 4px 0">Selected Cove</h4>
    <div class="selected-place-name" style="font-size:2em; font-weight:bold; color:#003B4F; margin:0">{{ selectedPlace.place.name }}</div>
    <div style="font-size:0.95em;color:#444;margin-top:4px">
      <a :href="selectedPlace.place.map || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlace.place.address)}`" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;color:inherit">
        <!-- simple Google place pin icon -->
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
          <circle cx="12" cy="9" r="2.5" fill="white"/>
        </svg>
        <span>{{ selectedPlace.place.address }}</span>
      </a>
    </div>
    <div v-if="selectedPlace.time" style="font-size:1.1em; margin-top:12px; font-weight:600; color:#21ba45">
      Today at {{ formatTimeWithAmPm(selectedPlace.time) }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, computed, watch } from 'vue'

type Person = { userId?: number; name: string; email: string }
type Place = { id: string; name: string; address: string; map?: string }

export default defineComponent({
  props: {
    people: { type: Array as () => Person[], default: () => [] },
    places: { type: Array as () => Place[], default: () => [] },
    winner: { type: String, default: '' },
    eventId: { type: String, default: '' },
    readOnly: { type: Boolean, default: false },
    showNotification: { type: Function as unknown as () => ((m:string,t?:'info'|'success'|'error')=>void), default: null },
    onPlaceSelected: { type: Function as unknown as () => ((place: any) => void), default: null }
  },
  setup(props) {
    const SELECTED_PLACE_KEY = 'selected_place_v1'
    const selectedPlace = ref<any>(null)
    const placeId = ref<string>('')
    const showModal = ref(false)
    const showTimeModal = ref(false)
    const pendingPlace = ref<Place | null>(null)
    const selectedTime = ref<string>('')
    const placesToShow = ref<Place[]>([])
    const tokenValid = ref(false)
    const isCaptainView = ref(false)
    let mounted = true
    
    // Validate token from URL
    function validateToken() {
      try {
        const searchParams = new URLSearchParams(window.location.search || '')
        const hash = window.location.hash
        const hashParams = new URLSearchParams(hash.split('?')[1] || '')

        const captainIdParam = searchParams.get('captinaid') || hashParams.get('captinaid')
        if (captainIdParam) {
          isCaptainView.value = true
          tokenValid.value = true
          return
        }

        const urlToken = searchParams.get('token') || hashParams.get('token')
        if (!urlToken) {
          isCaptainView.value = false
          tokenValid.value = false
          return
        }

        isCaptainView.value = true
        const storedToken = localStorage.getItem('winner_token_v1')
        tokenValid.value = !storedToken || urlToken === storedToken
      } catch (e) {
        console.error('Token validation error:', e)
        tokenValid.value = false
      }
    }

    // Generate all 15-minute time slots for the day
    const timeOptions = computed(() => {
      const times: string[] = []
      for (let hour = 0; hour < 24; hour++) {
        for (let min = 0; min < 60; min += 15) {
          const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
          times.push(timeStr)
        }
      }
      return times
    })

    function loadSelectedPlace() {
      try {
        const stored = localStorage.getItem(SELECTED_PLACE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (props.eventId && parsed?.eventId !== props.eventId) {
            selectedPlace.value = null
            placeId.value = ''
          } else {
            selectedPlace.value = parsed
            placeId.value = selectedPlace.value?.place?.id || ''
          }
        } else {
          selectedPlace.value = null
          placeId.value = ''
        }
      } catch (e) {
        console.debug('Load selected place error', e)
      }
    }

    onMounted(() => {
      mounted = true
      validateToken()
      loadSelectedPlace()
      placesToShow.value = [...(props.places || [])]
    })

    onUnmounted(() => {
      mounted = false
    })

    watch(() => props.places, (newPlaces) => {
      placesToShow.value = [...(newPlaces || [])]
    }, { deep: true })

    const displayName = computed(() => {
      const found = (props.people || []).find((p:Person) => {
        if (p.email === props.winner) return true
        if (p.userId == null) return false
        return String(p.userId) === props.winner
      })
      return found ? found.name : 'Unknown'
    })

    const placesOptions = computed(() => (props.places || []).map(p => ({ label: `${p.name} — ${p.address}`, value: p.id })))

    function formatTimeWithAmPm(time24: string): string {
      if (!time24) return ''
      const [hours, minutes] = time24.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      return `${displayHour}:${minutes} ${ampm}`
    }

    function confirmPlace() {
      if (!placeId.value) return
      try {
        const chosenPlace = (props.places || []).find(p => p.id === placeId.value)
        if (!chosenPlace) throw new Error('Place not found')
        
        selectedPlace.value = {
          place: chosenPlace,
          winner: props.winner,
          timestamp: new Date().toISOString()
        }
        localStorage.setItem(SELECTED_PLACE_KEY, JSON.stringify(selectedPlace.value))
        props.showNotification && props.showNotification(`${displayName.value} selected ${chosenPlace.name}!`, 'success')
      } catch (e) {
        console.error('confirm place failed', e)
        props.showNotification && props.showNotification('Failed to select place', 'error')
      }
    }

    function selectPlaceFromModal(place: Place) {
      if (props.readOnly) return
      pendingPlace.value = place
      selectedTime.value = '18:00' // Default to 6 PM
      showTimeModal.value = true
      showModal.value = false
    }

    function confirmTime(time: string) {
      if (props.readOnly) return
      if (!pendingPlace.value) return
      
      try {
        const wasSelected = selectedPlace.value && selectedPlace.value.place
        const oldPlace = wasSelected ? selectedPlace.value.place.name : null
        
        selectedPlace.value = {
          eventId: props.eventId || '',
          place: pendingPlace.value,
          time: time,
          winner: props.winner,
          timestamp: new Date().toISOString()
        }
        localStorage.setItem(SELECTED_PLACE_KEY, JSON.stringify(selectedPlace.value))
        
        // Notify parent component
        if (props.onPlaceSelected) {
          console.log('📍 Calling onPlaceSelected callback with:', selectedPlace.value)
          props.onPlaceSelected(selectedPlace.value)
        } else {
          console.warn('⚠️ onPlaceSelected callback not provided')
        }
        
        if (wasSelected) {
          props.showNotification && props.showNotification(`Cove changed from ${oldPlace} to ${pendingPlace.value.name} at ${time}`, 'success')
        } else {
          props.showNotification && props.showNotification(`${displayName.value} selected ${pendingPlace.value.name} at ${time}!`, 'success')
        }
        
        showTimeModal.value = false
        pendingPlace.value = null
        selectedTime.value = ''
      } catch (e) {
        console.error('confirm time failed', e)
        props.showNotification && props.showNotification('Failed to select time', 'error')
      }
    }

    function openPlacesModal() {
      if (props.readOnly) return
      placesToShow.value = [...(props.places || [])]
      showModal.value = true
    }

    return { displayName, selectedPlace, placeId, confirmPlace, placesOptions, showModal, selectPlaceFromModal, showTimeModal, pendingPlace, timeOptions, selectedTime, confirmTime, formatTimeWithAmPm, placesToShow, openPlacesModal, tokenValid, isCaptainView }
  }
})
</script>

<style scoped>
.panel { margin-bottom: 12px }
</style>
