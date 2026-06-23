const PRIMARY_API_BASE = (import.meta?.env?.VITE_API_BASE as string) || 'https://localhost:7079'
const EVENTS_CREATE_PATH = '/api/Events/create'
const EVENTS_BY_ID_PATH = '/api/Events'
const EVENTS_EDIT_PATH = '/api/Events/edit'
const RESPONSES_EDIT_PATH = '/api/Responses/edit'

export type EventUserApiItem = {
  userId: number
  fullName?: string
  vote?: string
  eta?: string | null
  isParticipant?: boolean
  isCaptain?: boolean
}

export type EventApiItem = {
  eventId: number
  eventDate?: string | null
  eventTime?: string | null
  status?: boolean
  votingUrl?: string
  place?: unknown
  captain?: unknown
  statistics?: {
    totalUsers?: number
    totalResponses?: number
    responseRate?: number
    yesVotes?: number
    noVotes?: number
    notSureVotes?: number
    participantCount?: number
    shouldCancel?: boolean
    captainSelected?: boolean
  }
  users?: EventUserApiItem[]
}

async function postNoBody(url: string): Promise<void> {
  const response = await fetch(url, { method: 'POST' })
  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(errText || `HTTP ${response.status}`)
  }
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(errText || `HTTP ${response.status}`)
  }

  return (await response.json()) as T
}

export const eventsApi = {
  async create(): Promise<void> {
    await postNoBody(`${PRIMARY_API_BASE}${EVENTS_CREATE_PATH}`)
  },

  async getById(id: number | string): Promise<EventApiItem> {
    return await getJson<EventApiItem>(`${PRIMARY_API_BASE}${EVENTS_BY_ID_PATH}/${encodeURIComponent(String(id))}`)
  },

  async edit(id: number | string, payload: { placeId: number; eventTime?: string }): Promise<void> {
    const url = `${PRIMARY_API_BASE}${EVENTS_EDIT_PATH}/${encodeURIComponent(String(id))}`
    const body = JSON.stringify(payload)

    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(errText || `HTTP ${response.status}`)
    }
  },

  async updateResponseEta(payload: { responseId: number; userId: number; eventId: number; vote: number; eta: string }): Promise<void> {
    const url = `${PRIMARY_API_BASE}${RESPONSES_EDIT_PATH}`
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(errText || `HTTP ${response.status}`)
    }
  },
}

export default eventsApi
