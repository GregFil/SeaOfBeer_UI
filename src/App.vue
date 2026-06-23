<template>
  <div class="app-root" :class="{ 'no-home-bg': currentPage === 'home' || currentPage === 'crew' || currentPage === 'coves' }">
    <Header @toggle="onToggleMenu" />
    <Menu :open="menuOpen" :home-href="homeMenuHash" :crew-href="crewMenuHash" :coves-href="covesMenuHash" @close="menuOpen = false" />
    <template v-if="currentPage !== 'empty'">
      <!-- Quorum Countdown Banner -->
      <div v-if="currentPage === 'home' && quorumReached && !winner" style="background:white; color:#21ba45; padding:16px; text-align:center; font-size:1.3em; font-weight:bold; border-bottom:2px solid #21ba45">
        <div>We have Quorum! Beer Captain will be selected in {{ countdownDisplay }}</div>
      </div>

      <Admin v-if="currentPage === 'admin'" :existing="people" :showNotification="showNotification" :onAddPerson="addPerson" :onDeletePerson="removePerson" />
      <People v-else-if="currentPage === 'crew'" :existing="people" :showNotification="showNotification" :onAddPerson="addPerson" :onEditPerson="editPerson" :onDeletePerson="removePerson" />
      <Places v-else-if="currentPage === 'coves'" :admin="true" :showNotification="showNotification" />

      <main class="container home-container" v-if="currentPage === 'home'">
        <div class="home-shortcuts" style="display:flex; gap:8px; justify-content:center; margin-bottom:6px; flex-wrap:wrap">
          <q-btn color="blue-grey-7" text-color="white" flat label="Quarterdeck" @click="goToHash('#/')" />
          <q-btn color="blue-grey-7" text-color="white" flat label="Crew" @click="goToHash('#/crew')" />
          <q-btn color="blue-grey-7" text-color="white" flat label="Coves" @click="goToHash('#/coves')" />
        </div>

        <!-- Winner Selected State -->
        <div v-if="showWinnerBanner">
          <WinnerBanner :people="people" :places="places" :winner="effectiveWinner" :eventId="currentEventId" :read-only="isVotingReadOnly" :showNotification="showNotification" :onPlaceSelected="onPlaceSelected" />
        </div>

        <div v-if="!votingActive && !winner" style="text-align:center; margin-bottom:24px">
          <h2 class="main-heading" style="font-family:'Pirata One', cursive; font-size:2.2em; margin:12px 0; color:#003B4F">
            'Tis time to chart a course and choose where we drop anchor to get properly pickled, ye scallywags!
          </h2>
          <q-btn color="blue-grey-7" text-color="white" :disable="isSending" @click="manualSend" :label="isSending ? 'Sending...' : 'All Hands on Deck'" />
        </div>

        <!-- Voting Active State -->
        <div v-if="votingActive" class="panel" style="margin-bottom:12px; background: linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)), url('/banner.png'); background-position:center; background-repeat:no-repeat; background-size:calc(100% - 4px) calc(100% - 4px);">
          <div v-if="!currentEventId" style="background:#f9f9f9; padding:12px; border-radius:4px; border:1px solid #ddd; margin-bottom:12px">
            <div style="margin-bottom:8px; word-break:break-all">
              <strong>Email Recipients:</strong><br/>
              <code style="font-size:0.9em; color:#666">{{ people.map(p => p.email).join('; ') }}</code>
            </div>
            <div style="margin-bottom:8px">
              <strong>Subject:</strong><br/>
              <code style="font-size:0.9em; color:#666">'Tis time to chart a course - Vote Now!</code>
            </div>
            <div style="margin-bottom:8px">
              <strong>Voting Link:</strong><br/>
              <code style="font-size:0.9em; color:#0066cc; cursor:pointer" @click="copyLinkToClipboard">
                {{ groupEmailLink }}
              </code>
            </div>
            <div style="font-size:0.9em; color:#666; margin-top:12px">
              💡 Share the voting link above with the crew. They can vote via the page with three options: YES, NO, or NOT SURE.
            </div>
          </div>

          <h4 class="drink-title" style="color:#003B4F">I will drink</h4>
          <div style="margin-bottom:16px">
            <strong>{{ totalResponses }}/{{ people.length }} responded</strong>
            <div style="margin-top:8px; color:#666">
                Yes: {{ yesResponses }} ({{ percentageYes }}%) | No: {{ noResponses }} | Not Sure: {{ notSureResponses }}
            </div>
          </div>
          
          <ul style="list-style:none; padding:0">
            <li v-for="crew in getCrewStatus" :key="crew.rowKey" style="padding:8px; border-bottom:1px solid #999; display:grid; grid-template-columns:1fr 150px 1fr; align-items:center; gap:16px">
              <span class="crew-status-name" :style="{ 
                color: crew.response === 'no' ? '#999' : crew.response === 'not-sure' ? '#FF9500' : 'inherit',
                textDecoration: crew.response === 'no' ? 'line-through' : 'none',
                fontSize: crew.response === 'not-sure' ? '1.5em' : '2em',
                fontWeight: 'bold',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }">
                {{ crew.name }}
              </span>

              <!-- Time display for YES voters when place is selected (always reserve space) -->
              <div v-if="crew.response === 'yes' && selectedPlaceInfo" style="display:flex; gap:4px; align-items:center; justify-content:center; justify-self:center">
                <q-btn :disable="isVotingReadOnly" @click="adjustCrewTime(crew, -15)" icon="remove" dense flat class="time-adjust-btn" />
                <span :style="{ 
                  minWidth: '60px', 
                  textAlign: 'center', 
                  fontSize: '0.9em', 
                  fontWeight: '700',
                  color: compareCrewTimeToSelectedTime(crewTimes[getResponseKey(crew)] || '18:00') === 'early' ? '#21ba45' : compareCrewTimeToSelectedTime(crewTimes[getResponseKey(crew)] || '18:00') === 'late' ? '#8B0000' : '#003B4F'
                }">
                  {{ formatTimeWithAmPm(crewTimes[getResponseKey(crew)] || '18:00') }}
                </span>
                <q-btn :disable="isVotingReadOnly" @click="adjustCrewTime(crew, 15)" icon="add" dense flat class="time-adjust-btn" />
              </div>
              <div v-else style="min-height:32px; justify-self:center"></div>

              <div style="display:flex; gap:8px; justify-content:flex-end">
                <span @click="isVotingReadOnly ? null : recordResponse(crew, 'yes')" :style="{ cursor: isVotingReadOnly ? 'not-allowed' : 'pointer', opacity: isVotingReadOnly ? 0.6 : 1, fontWeight:'bold', fontSize:'1.5em', padding:'4px 8px', borderRadius:'4px', color: responses[getResponseKey(crew)] === 'yes' ? '#fff' : '#999', background: responses[getResponseKey(crew)] === 'yes' ? '#21ba45' : 'transparent', transition:'all 0.2s' }" title="YES">Y</span>
                <span @click="isVotingReadOnly ? null : recordResponse(crew, 'no')" :style="{ cursor: isVotingReadOnly ? 'not-allowed' : 'pointer', opacity: isVotingReadOnly ? 0.6 : 1, fontWeight:'bold', fontSize:'1.5em', padding:'4px 8px', borderRadius:'4px', color: responses[getResponseKey(crew)] === 'no' ? '#fff' : '#999', background: responses[getResponseKey(crew)] === 'no' ? '#db2828' : 'transparent', transition:'all 0.2s' }" title="NO">N</span>
                <span @click="isVotingReadOnly ? null : recordResponse(crew, 'not-sure')" :style="{ cursor: isVotingReadOnly ? 'not-allowed' : 'pointer', opacity: isVotingReadOnly ? 0.6 : 1, fontWeight:'bold', fontSize:'1.5em', padding:'4px 8px', borderRadius:'4px', color: responses[getResponseKey(crew)] === 'not-sure' ? '#fff' : '#999', background: responses[getResponseKey(crew)] === 'not-sure' ? '#FF9500' : 'transparent', transition:'all 0.2s' }" title="NOT SURE">?</span>
              </div>
            </li>
          </ul>
        </div>
      </main>
    </template>

    <Notification v-if="currentPage !== 'empty'" :message="notify.message" :type="notify.type" :visible="notify.visible" @close="hideNotification" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import Header from './components/Header.vue'
import Menu from './components/Menu.vue'
import Notification from './components/Notification.vue'
import WinnerBanner from './components/WinnerBanner.vue'
import Admin from './components/Admin.vue'
import People from './components/People.vue'
import Places from './components/Places.vue'
import { eventsApi, type EventApiItem } from './services/eventsApi'
import { usersApi, type UserApiItem, type UserUpsertPayload } from './services/usersApi'

// Types
type Person = { userId?: number; name: string; email: string }
type Place = { id: string; name: string; address: string; map?: string }
type ApiPlace = { placeId: number; name: string; address: string; link?: string }
type NotificationType = 'error' | 'success' | 'info'
type NotificationState = { message: string; type: NotificationType; visible: boolean }
type PageType = 'home' | 'admin' | 'crew' | 'coves' | 'empty'
type VoteChoice = 'yes' | 'no' | 'not-sure'

// Constants
const NOTIFICATION_TIMEOUT = 4000
const RESPONSES_STORAGE_KEY = 'responses_v1'
const API_BASE = (import.meta?.env?.VITE_API_BASE as string) || 'https://localhost:7079'
const VOTE_VALUE_BY_CHOICE: Record<VoteChoice, number> = {
  yes: 1,
  no: 0,
  'not-sure': 2,
}

// State
const people = ref<Person[]>([])
const places = ref<Place[]>([])
const notify = ref<NotificationState>({ message: '', type: 'info', visible: false })
const isSending = ref(false)
const menuOpen = ref(false)
const currentPage = ref<PageType>('home')
const currentEventId = ref<string>('')
const currentHashQuery = ref('')
const responses = ref<Record<string, 'yes' | 'no' | 'not-sure'>>({})
const winner = ref<string>('')
const votingActive = ref(false)
const groupEmailLink = ref<string>('')
const quorumReached = ref(false)
const quorumTime = ref<number | null>(null)
const countdownSeconds = ref(0)
const selectedPlaceInfo = ref<any>(null)
const currentEventTime = ref<string>('')
const isPastEvent = ref(false)
const crewTimes = ref<Record<string, string>>({}) // Store time for each crew member
let countdownInterval: any = null
let eventRefreshInterval: any = null

// UI Actions
const onToggleMenu = () => { menuOpen.value = !menuOpen.value }
const hideNotification = () => { notify.value.visible = false }

function goToHash(hash: string) {
  const suffix = currentHashQuery.value

  if (currentEventId.value && hash === '#/') {
    window.location.hash = `#/${currentEventId.value}${suffix}`
    return
  }

  if (suffix && (hash === '#/crew' || hash === '#/coves')) {
    window.location.hash = `${hash}${suffix}`
    return
  }

  window.location.hash = hash
}

const homeMenuHash = computed(() => currentEventId.value ? `#/${currentEventId.value}${currentHashQuery.value}` : '#/')
const crewMenuHash = computed(() => `#/crew${currentHashQuery.value}`)
const covesMenuHash = computed(() => `#/coves${currentHashQuery.value}`)

function getEventIdFromHash(hash: string): string | null {
  const match = hash.match(/^#\/([^/?#]+)/)
  if (!match) return null

  const segment = match[1]
  if (segment === 'admin' || segment === 'crew' || segment === 'coves') return null
  return segment
}

const checkHash = () => {
  try {
    const hash = window.location.hash
    const queryIndex = hash.indexOf('?')
    currentHashQuery.value = queryIndex >= 0 ? hash.slice(queryIndex) : ''
    if (hash.startsWith('#/admin')) currentPage.value = 'admin'
    else if (hash.startsWith('#/crew')) currentPage.value = 'crew'
    else if (hash.startsWith('#/coves')) currentPage.value = 'coves'
    else {
      const eventId = getEventIdFromHash(hash)
      currentEventId.value = eventId || ''
      currentPage.value = eventId ? 'home' : 'empty'
      menuOpen.value = !eventId

      if (eventId) {
        // Event links like #/2 should open the voting view directly.
        votingActive.value = true
        groupEmailLink.value = ''
      }
      if (!eventId) currentEventId.value = ''
    }
  } catch (e) {
    currentPage.value = 'empty'
    currentEventId.value = ''
    menuOpen.value = true
  }
}

// Copy voting link to clipboard
const copyLinkToClipboard = () => {
  if (groupEmailLink.value) {
    window.navigator.clipboard.writeText(groupEmailLink.value)
    showNotification('Link copied to clipboard!', 'success')
  }
}

// Computed properties for voting
const yesResponses = computed(() => Object.values(responses.value).filter(r => r === 'yes').length)
const noResponses = computed(() => Object.values(responses.value).filter(r => r === 'no').length)
const notSureResponses = computed(() => Object.values(responses.value).filter(r => r === 'not-sure').length)
const totalResponses = computed(() => yesResponses.value + noResponses.value + notSureResponses.value)
const percentageYes = computed(() => totalResponses.value > 0 ? Math.round((yesResponses.value / totalResponses.value) * 100) : 0)
const canSelectWinner = computed(() => yesResponses.value >= 3)
const allResponded = computed(() => totalResponses.value === people.value.length)
const isVotingReadOnly = computed(() => currentPage.value === 'home' && !!currentEventId.value && isPastEvent.value)
const captainIdFromQuery = computed(() => {
  const query = (currentHashQuery.value || '').replace(/^\?/, '')
  if (!query) return ''
  const params = new URLSearchParams(query)
  return String(params.get('captinaid') || '').trim()
})
const hasCaptainAccessQuery = computed(() => {
  const query = (currentHashQuery.value || '').replace(/^\?/, '')
  if (!query) return false
  const params = new URLSearchParams(query)
  return Boolean(params.get('captinaid') || params.get('token'))
})
const effectiveWinner = computed(() => winner.value || captainIdFromQuery.value)
const showWinnerBanner = computed(() => currentPage.value === 'home' && (!!winner.value || hasCaptainAccessQuery.value))

// Quorum countdown format
const countdownDisplay = computed(() => {
  const hours = Math.floor(countdownSeconds.value / 3600)
  const mins = Math.floor((countdownSeconds.value % 3600) / 60)
  return `${hours}:${mins.toString().padStart(2, '0')}`
})

// Helper for crew status to ensure reactivity
const getCrewStatus = computed(() => {
  const uniqueCrew = new Map<string, {
    rowKey: string
    userId?: number
    name: string
    email: string
    response: VoteChoice | null
  }>()

  for (const person of people.value) {
    const rowKey = person.userId != null
      ? `uid:${person.userId}`
      : `email:${person.email.trim().toLowerCase()}`

    if (uniqueCrew.has(rowKey)) continue

    uniqueCrew.set(rowKey, {
      rowKey,
      userId: person.userId,
      name: person.name,
      email: person.email,
      response: responses.value[getResponseKey(person)] || null,
    })
  }

  return Array.from(uniqueCrew.values())
})

function getResponseKey(target: Pick<Person, 'userId' | 'email'>) {
  return target.userId != null ? String(target.userId) : target.email.trim().toLowerCase()
}

// People Management
async function addPerson(person: Person) {
  try {
    await usersApi.add(toUserPayload(person))
    await loadPeople()
  } catch (e) {
    console.error('addPerson failed:', e)
  }
}

async function removePerson(email: string) {
  try {
    const removed = (people.value || []).find((p) => p.email === email)
    people.value = (people.value || []).filter((p) => p.email !== email)
    if (removed) {
      delete responses.value[getResponseKey(removed)]
      saveResponses()
    }
  } catch (e) {
    console.error('removePerson failed:', e)
  }
}

async function editPerson(oldEmail: string, person: Person) {
  try {
    const existing = (people.value || []).find((p) => p.email === oldEmail)
    if (!existing || existing.userId == null) {
      throw new Error('User id is required to edit crew member')
    }

    await usersApi.edit(existing.userId, toUserPayload(person))
    await loadPeople()
  } catch (e) {
    console.error('editPerson failed:', e)
  }
}

function toUserPayload(person: Person): UserUpsertPayload {
  const fullName = person.name.trim()
  const parts = fullName.split(/\s+/).filter(Boolean)
  const firstName = parts[0] || fullName
  const lastName = parts.slice(1).join(' ')

  return {
    firstName,
    lastName,
    fullName,
    email: person.email.trim(),
  }
}

function toPerson(user: UserApiItem): Person {
  const resolvedName = user.fullName?.trim() || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown'

  return {
    userId: user.userId,
    name: resolvedName,
    email: (user.email || '').trim(),
  }
}

function mapEventVoteToChoice(vote: string | undefined): VoteChoice | null {
  const normalizedVote = String(vote || '').trim().toUpperCase()
  if (normalizedVote === 'YES') return 'yes'
  if (normalizedVote === 'NO') return 'no'
  if (normalizedVote === 'NOT SURE') return 'not-sure'
  return null
}

function toPlace(apiPlace: ApiPlace): Place {
  return {
    id: String(apiPlace.placeId),
    name: apiPlace.name,
    address: apiPlace.address,
    map: apiPlace.link || '',
  }
}

// Notifications
function showNotification(
  message: string,
  type: NotificationType = 'info'
) {
  notify.value = { message, type, visible: true }
  setTimeout(hideNotification, NOTIFICATION_TIMEOUT)
}

async function sendVoteToApi(userId: number, vote: VoteChoice) {
  if (!currentEventId.value) return

  const response = await fetch(`${API_BASE}/api/Voting/vote/${encodeURIComponent(currentEventId.value)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, vote: VOTE_VALUE_BY_CHOICE[vote] }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    const normalizedError = errText.toLowerCase()
    const hasCaptainHistoryTableError = normalizedError.includes("invalid object name 'captainhistories'")

    if (hasCaptainHistoryTableError) {
      console.warn('Vote API returned known backend DB issue:', errText)
      return 'degraded'
    }

    throw new Error(errText || `HTTP ${response.status}`)
  }

  return 'sent'
}

// Send Queue / Voting
function saveResponses() {
  try {
    localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(responses.value))
  } catch (e) {
    console.warn('Failed to save responses:', e)
  }
}

function loadResponses() {
  try {
    const stored = localStorage.getItem(RESPONSES_STORAGE_KEY)
    if (stored) {
      responses.value = JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to load responses:', e)
  }
}

async function recordResponse(target: Pick<Person, 'userId' | 'email'>, vote: VoteChoice) {
  if (isVotingReadOnly.value) return
  const responseKey = getResponseKey(target)
  const wasFirstVote = !responses.value[responseKey]
  responses.value[responseKey] = vote
  saveResponses()

  if (currentEventId.value) {
    try {
      const person = target.userId != null
        ? target
        : people.value.find((entry) => getResponseKey(entry) === responseKey)

      if (!person?.userId) {
        throw new Error('User id is required to vote')
      }

      const sendState = await sendVoteToApi(person.userId, vote)
      if (sendState === 'degraded') {
        showNotification('Vote recorded, but API has a backend table issue (CaptainHistories).', 'info')
      } else {
        showNotification('Vote sent to API', 'success')
      }

      if (wasFirstVote) {
        const defaultEta = getDefaultEtaTime()
        crewTimes.value[responseKey] = defaultEta
        saveCrewTimes()

        const eventId = Number(currentEventId.value)
        if (Number.isFinite(eventId) && eventId > 0) {
          try {
            await eventsApi.updateResponseEta({
              responseId: 0,
              userId: person.userId,
              eventId,
              vote: VOTE_VALUE_BY_CHOICE[vote],
              eta: `${defaultEta}:00`,
            })
          } catch (etaError) {
            console.warn('Failed to initialize ETA on first vote:', etaError)
          }
        }
      }
    } catch (e) {
      console.error('sendVoteToApi failed:', e)
      showNotification(`Failed to send vote: ${String((e as Error)?.message || e)}`, 'error')
    }
  }
  
  // Check if we just reached quorum (3+ YES votes)
  if (canSelectWinner.value && !quorumReached.value) {
    quorumReached.value = true
    quorumTime.value = Date.now()
    localStorage.setItem('quorum_time_v1', quorumTime.value.toString())
    countdownSeconds.value = 7200 // 2 hours in seconds
    showNotification(`Quorum reached! ${yesResponses.value} people voted YES!`, 'success')
    
    // Start countdown
    if (countdownInterval) clearInterval(countdownInterval)
    countdownInterval = setInterval(() => {
      countdownSeconds.value--
      if (countdownSeconds.value <= 0) {
        clearInterval(countdownInterval)
        selectRandomWinner()
        quorumReached.value = false
      }
    }, 1000)
  }
  
  // Check if all people have voted
  if (allResponded.value && quorumReached.value) {
    showNotification('All crew members voted! Selecting Beer Captain now...', 'success')
    if (countdownInterval) clearInterval(countdownInterval)
    quorumReached.value = false
    setTimeout(() => {
      selectRandomWinner()
    }, 500)
  }
}

function generateToken(): string {
  // Generate a unique token using timestamp + random string
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${random}`
}

function selectRandomWinner() {
  const yesVoters = people.value.filter((p) => responses.value[getResponseKey(p)] === 'yes')
  if (yesVoters.length === 0) {
    showNotification('No one voted yes yet', 'error')
    return
  }
  
  const randomIndex = Math.floor(Math.random() * yesVoters.length)
  winner.value = yesVoters[randomIndex].email
  const winnerName = yesVoters[randomIndex].name
  const winnerEmail = yesVoters[randomIndex].email
  
  // Generate and store winner token
  const winnerToken = generateToken()
  localStorage.setItem('winner_v1', winner.value)
  localStorage.setItem('winner_token_v1', winnerToken)
  
  localStorage.removeItem('quorum_time_v1')
  quorumReached.value = false
  if (countdownInterval) clearInterval(countdownInterval)
  
  // Log captain email with secure token link
  const votingUrl = window.location.origin + window.location.pathname + '#/'
  const captainLink = votingUrl + `?token=${winnerToken}`
  const captainEmailBody = `Ahoy, Beer Captain ${winnerName}!\n\nYou've been selected as the Beer Captain! 🏴‍☠️\n\nUse this special link to select the meeting cove and time:\n${captainLink}\n\n(This link only works for you - it's secured with a unique token)\n\nHarrrr!`
  
  console.log('⚓ BEER CAPTAIN SELECTED - EMAIL TO SEND:')
  console.log('='.repeat(70))
  console.log(`To: ${winnerEmail}`)
  console.log(`Subject: You're the Beer Captain! 🏴‍☠️`)
  console.log(`\nMessage:\n${captainEmailBody}`)
  console.log('\n🔐 Token Link: ' + captainLink)
  console.log('='.repeat(70))
  
  showNotification(`${winnerName} is the Beer Captain!`, 'success')
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number)
  let totalMinutes = hours * 60 + mins + minutes
  
  // Handle day wrap-around
  if (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60
  if (totalMinutes < 0) totalMinutes += 24 * 60
  
  const newHours = Math.floor(totalMinutes / 60)
  const newMins = totalMinutes % 60
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
}

function normalizeToHHMM(value: string | null | undefined): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const match = raw.match(/^(\d{2}:\d{2})/)
  return match ? match[1] : ''
}

function getDefaultEtaTime(): string {
  return normalizeToHHMM(selectedPlaceInfo.value?.time)
    || normalizeToHHMM(currentEventTime.value)
    || '18:00'
}

function isEventDateInPast(eventDate: string | null | undefined): boolean {
  const raw = String(eventDate || '').trim()
  if (!raw) return false

  let eventDay: Date | null = null
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const year = Number(isoMatch[1])
    const month = Number(isoMatch[2])
    const day = Number(isoMatch[3])
    eventDay = new Date(year, month - 1, day)
  } else {
    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return false
    eventDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return eventDay.getTime() < today.getTime()
}

const etaDebounceTimers: Record<string, ReturnType<typeof setTimeout>> = {}

function adjustCrewTime(target: Pick<Person, 'userId' | 'email'>, minutes: number) {
  if (isVotingReadOnly.value) return
  const key = getResponseKey(target)
  const currentTime = crewTimes.value[key] || '18:00'
  crewTimes.value[key] = addMinutesToTime(currentTime, minutes)
  saveCrewTimes()

  if (!currentEventId.value) return

  const userId = target.userId ?? people.value.find(p => getResponseKey(p) === key)?.userId
  if (!userId) return
  const eventId = Number(currentEventId.value)
  if (!Number.isFinite(eventId) || eventId <= 0) return

  const newTime = crewTimes.value[key]
  clearTimeout(etaDebounceTimers[key])
  etaDebounceTimers[key] = setTimeout(async () => {
    try {
      const normalizedEta = /^\d{2}:\d{2}$/.test(newTime) ? `${newTime}:00` : newTime
      const voteChoice = responses.value[String(userId)]
      const vote = voteChoice ? VOTE_VALUE_BY_CHOICE[voteChoice] : 0
      await eventsApi.updateResponseEta({
        responseId: 0,
        userId,
        eventId,
        vote,
        eta: normalizedEta,
      })
    } catch (e) {
      console.error('Failed to update user ETA:', e)
    }
  }, 800)
}

function saveCrewTimes() {
  try {
    localStorage.setItem('crew_times_v1', JSON.stringify(crewTimes.value))
  } catch (e) {
    console.warn('Failed to save crew times:', e)
  }
}

function loadCrewTimes() {
  try {
    const stored = localStorage.getItem('crew_times_v1')
    if (stored) {
      crewTimes.value = JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to load crew times:', e)
  }
}

// Compare two times in HH:MM format (returns 'early', 'same', 'late')
function compareCrewTimeToSelectedTime(crewTime: string): 'early' | 'same' | 'late' {
  if (!selectedPlaceInfo.value || !selectedPlaceInfo.value.time) return 'same'
  
  const selectedTime = selectedPlaceInfo.value.time
  const [crewHours, crewMins] = crewTime.split(':').map(Number)
  const [selectedHours, selectedMins] = selectedTime.split(':').map(Number)
  
  const crewTotalMins = crewHours * 60 + crewMins
  const selectedTotalMins = selectedHours * 60 + selectedMins
  
  if (crewTotalMins < selectedTotalMins) return 'early'
  if (crewTotalMins > selectedTotalMins) return 'late'
  return 'same'
}
async function onPlaceSelected(place: any) {
  if (isVotingReadOnly.value) return
  selectedPlaceInfo.value = place
  console.log('✅ onPlaceSelected called in App.vue')
  console.log('   Place:', place?.place?.name)
  console.log('   Time:', place?.time)
  console.log('   selectedPlaceInfo.value is now:', selectedPlaceInfo.value)
  console.log('   Should show times in crew status now')

  if (currentEventId.value) {
    try {
      const selectedPlaceId = Number(place?.place?.id)
      if (Number.isFinite(selectedPlaceId) && selectedPlaceId > 0) {
        const rawEventTime = String(place?.time || '').trim()
        const normalizedEventTime = /^\d{2}:\d{2}$/.test(rawEventTime)
          ? `${rawEventTime}:00`
          : rawEventTime || undefined

        await eventsApi.edit(currentEventId.value, {
          placeId: selectedPlaceId,
          eventTime: normalizedEventTime,
        })
      }
    } catch (e) {
      console.error('Failed to persist selected cove to event:', e)
      showNotification(`Failed to save selected cove: ${String((e as Error)?.message || e)}`, 'error')
    }
  }
  
  // Reset all crew times to the selected cove time
  if (place?.time) {
    crewTimes.value = {}
    people.value.forEach(person => {
      crewTimes.value[getResponseKey(person)] = place.time
    })
    saveCrewTimes()
    console.log('🔄 Reset all crew times to:', place.time)
  }
}

function formatTimeWithAmPm(time24: string): string {
  if (!time24) return ''
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

async function manualSend() {
  if (people.value.length === 0) {
    showNotification('No people in the list', 'error')
    return
  }

  if (currentEventId.value) {
    showNotification('Event voting is active; skip sending invitations.', 'info')
    return
  }

  isSending.value = true
  try {
    // Get voting page URL
    const votingUrl = window.location.origin + window.location.pathname + '#/'
    groupEmailLink.value = votingUrl
    
    await eventsApi.create()

    // Start voting
    responses.value = {}
    votingActive.value = true
    winner.value = ''
    quorumReached.value = false
    countdownSeconds.value = 0
    showNotification(`Invitations sent via API to ${people.value.length} crew members. Cast your votes now.`, 'success')
  } catch (e) {
    console.error('manualSend failed:', e)
    showNotification(`Failed to send emails: ${String((e as Error)?.message || e)}`, 'error')
  } finally {
    isSending.value = false
  }
}

function resetVoting() {
  if (!confirm('Reset voting and clear crew status?\n\nThis will clear all votes, winner selection, and selected cove.\nCrew and Coves will be preserved.')) {
    return
  }
  
  // Clear voting data
  responses.value = {}
  winner.value = ''
  votingActive.value = false
  quorumReached.value = false
  countdownSeconds.value = 0
  groupEmailLink.value = ''
  
  // Clear from localStorage
  localStorage.removeItem(RESPONSES_STORAGE_KEY)
  localStorage.removeItem('winner_v1')
  localStorage.removeItem('winner_token_v1')
  localStorage.removeItem('selected_place_v1')
  localStorage.removeItem('quorum_time_v1')
  
  // Stop countdown
  if (countdownInterval) clearInterval(countdownInterval)
  
  showNotification('Voting reset! Ready to send new invitations.', 'success')
}

// Data Loading
const loadPeople = async () => {
  try {
    const apiUsers = await usersApi.list()
    const mapped = apiUsers.map((user) => toPerson(user))

    people.value = mapped
    normalizeResponses()

    const missingEmailCount = mapped.filter((p) => !p.email).length
    if (missingEmailCount > 0) {
      showNotification(`${missingEmailCount} crew member(s) have no email from API`, 'info')
    }
  } catch (e) {
    console.warn('Failed to load people:', e)
    people.value = []
  }
}

const loadEventDetails = async (eventId: string) => {
  const event = await eventsApi.getById(eventId)
  applyEventToHomeState(event)
}

function applyEventToHomeState(event: EventApiItem) {
  const apiUsers = Array.isArray(event.users) ? event.users : []
  const captainUser = apiUsers.find((user) => user.isCaptain)
  const mappedPeople: Person[] = apiUsers.map((user) => ({
    userId: user.userId,
    name: (user.fullName || '').trim() || `User ${user.userId}`,
    email: '',
  }))

  const eventResponses: Record<string, VoteChoice> = {}
  for (const user of apiUsers) {
    const choice = mapEventVoteToChoice(user.vote)
    if (!choice) continue
    eventResponses[String(user.userId)] = choice
  }

  people.value = mappedPeople
  responses.value = eventResponses
  currentEventTime.value = normalizeToHHMM(event.eventTime)
  isPastEvent.value = isEventDateInPast(event.eventDate)
  winner.value = captainUser ? String(captainUser.userId) : ''
  saveResponses()
  votingActive.value = event.status ?? true
  groupEmailLink.value = event.votingUrl || ''
}

const loadPlaces = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/admin/Places?t=${Date.now()}`, { cache: 'no-store' })
    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(errText || `HTTP ${response.status}`)
    }
    const data = await response.json()
    if (!Array.isArray(data)) {
      throw new Error('Invalid places API response')
    }

    places.value = data.map((item) => toPlace(item as ApiPlace))
  } catch (e) {
    console.warn('Failed to load places:', e)
    places.value = []
  }
}

const loadSelectedPlace = () => {
  try {
    const stored = localStorage.getItem('selected_place_v1')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (currentEventId.value && parsed?.eventId !== currentEventId.value) {
        selectedPlaceInfo.value = null
      } else {
        selectedPlaceInfo.value = parsed
      }
    } else {
      selectedPlaceInfo.value = null
    }
  } catch (e) {
    console.warn('Failed to load selected place:', e)
    selectedPlaceInfo.value = null
  }
}

function normalizeResponses() {
  if (people.value.length === 0 || Object.keys(responses.value).length === 0) return

  const normalized: Record<string, VoteChoice> = {}

  for (const person of people.value) {
    const key = getResponseKey(person)
    const legacyKey = person.email.trim().toLowerCase()
    const response = responses.value[key] || responses.value[legacyKey]
    if (response) {
      normalized[key] = response
    }
  }

  responses.value = normalized
  saveResponses()
}

// Lifecycle
onMounted(async () => {
  checkHash()
  window.addEventListener('hashchange', checkHash)
  menuOpen.value = currentPage.value === 'empty'
  
  // Listen for storage changes from other tabs/windows (and trigger reload on place selection)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'selected_place_v1') {
      loadSelectedPlace()
      console.log('🔄 Updated selectedPlaceInfo from storage event')
    }
  }
  window.addEventListener('storage', handleStorageChange)
  
  // Load data first
  if (currentEventId.value) {
    try {
      await loadEventDetails(currentEventId.value)
    } catch (e) {
      console.error('Failed to load event details:', e)
      showNotification('Failed to load event details', 'error')
      await loadPeople()
    }
  } else {
    await loadPeople()
  }
  await loadPlaces()
  loadResponses()
  if (currentEventId.value) {
    try {
      await loadEventDetails(currentEventId.value)
    } catch (e) {
      console.error('Failed to refresh event details after local load:', e)
    }
  } else {
    normalizeResponses()
  }
  loadSelectedPlace()
  loadCrewTimes()
  
  // Load winner from local storage only for non-event routes.
  if (!currentEventId.value) {
    try {
      const storedWinner = localStorage.getItem('winner_v1')
      if (storedWinner) winner.value = storedWinner
    } catch (e) {}
  }
  
  // If there are responses in localStorage, activate voting
  if (Object.keys(responses.value).length > 0 && people.value.length > 0) {
    console.log('🔍 Debug Info:')
    console.log('Responses:', responses.value)
    console.log('People:', people.value.map(p => p.email))
    
    votingActive.value = true
    
    // Auto-select winner if conditions are met and no winner yet
    const yesCount = Object.values(responses.value).filter(r => r === 'yes').length
    const totalCount = Object.keys(responses.value).length
    const percentYes = totalCount > 0 ? Math.round((yesCount / totalCount) * 100) : 0
    
    console.log(`Yes: ${yesCount}, Total: ${totalCount}, Percent: ${percentYes}%`)
    console.log(`Can select winner: ${yesCount >= 3}`)
    
    if (!winner.value && yesCount >= 3) {
      // Check if quorum was reached before (restore state)
      try {
        const storedQuorum = localStorage.getItem('quorum_time_v1')
        if (storedQuorum) {
          const quorumStartTime = parseInt(storedQuorum)
          const elapsedSeconds = Math.floor((Date.now() - quorumStartTime) / 1000)
          const remainingSeconds = Math.max(0, 7200 - elapsedSeconds)
          
          if (remainingSeconds > 0) {
            // Quorum still active
            quorumReached.value = true
            quorumTime.value = quorumStartTime
            countdownSeconds.value = remainingSeconds
            
            // Resume countdown
            if (countdownInterval) clearInterval(countdownInterval)
            countdownInterval = setInterval(() => {
              countdownSeconds.value--
              if (countdownSeconds.value <= 0) {
                clearInterval(countdownInterval)
                selectRandomWinner()
                quorumReached.value = false
                localStorage.removeItem('quorum_time_v1')
              }
            }, 1000)
          } else {
            // 2 hours elapsed, select winner
            localStorage.removeItem('quorum_time_v1')
            selectRandomWinner()
          }
        } else if (!quorumReached.value) {
          // First time reaching quorum this session
          quorumReached.value = true
          quorumTime.value = Date.now()
          localStorage.setItem('quorum_time_v1', quorumTime.value.toString())
          countdownSeconds.value = 7200
          
          if (countdownInterval) clearInterval(countdownInterval)
          countdownInterval = setInterval(() => {
            countdownSeconds.value--
            if (countdownSeconds.value <= 0) {
              clearInterval(countdownInterval)
              selectRandomWinner()
              quorumReached.value = false
              localStorage.removeItem('quorum_time_v1')
            }
          }, 1000)
        }
      } catch (e) {
        console.error('Quorum restore error:', e)
      }
    }
  }
})

// Reload selected place when winner is set (to sync with WinnerBanner changes)
watch(winner, () => {
  loadSelectedPlace()
})

onUnmounted(() => {
  try {
    window.removeEventListener('hashchange', checkHash)
    if (countdownInterval) clearInterval(countdownInterval)
    if (eventRefreshInterval) clearInterval(eventRefreshInterval)
  } catch (e) {
    console.warn('Failed to clean up:', e)
  }
})

// Reload places when returning home to sync with changes made in Coves section
watch(currentPage, (newPage) => {
  if (newPage === 'home') {
    loadPlaces()
  }
})

watch(currentEventId, async (newEventId, oldEventId) => {
  if (newEventId === oldEventId) return

  if (eventRefreshInterval) {
    clearInterval(eventRefreshInterval)
    eventRefreshInterval = null
  }

  if (newEventId) {
    try {
      await loadEventDetails(newEventId)
    } catch (e) {
      console.error('Failed to load event details on hash change:', e)
      showNotification('Failed to load event details', 'error')
    }

    eventRefreshInterval = setInterval(async () => {
      if (!currentEventId.value) return

      try {
        await loadEventDetails(currentEventId.value)
      } catch (e) {
        console.error('Background event refresh failed:', e)
      }
    }, 30000)
    return
  }

  await loadPeople()
  loadResponses()
  normalizeResponses()
  isPastEvent.value = false
})
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Pirata+One&display=swap');

.container { padding: 12px }
.notification { position: fixed; bottom: 12px; right: 12px; padding: 8px 12px; border-radius: 4px }
.notification.success { background: #d4edda }
.notification.error { background: #f8d7da }
.notification.info { background: #d1ecf1 }
</style>
