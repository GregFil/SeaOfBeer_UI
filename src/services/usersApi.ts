export type UserApiItem = {
  userId: number
  firstName?: string
  lastName?: string
  fullName?: string
  email?: string
}

export type UserUpsertPayload = {
  firstName: string
  lastName: string
  fullName: string
  email: string
}

const API_BASE = (import.meta?.env?.VITE_API_BASE as string) || 'https://localhost:7079'
const USERS_API_BASE = `${API_BASE}/api/admin/Users`

async function parseError(response: Response): Promise<string> {
  const text = await response.text().catch(() => '')
  return text || `HTTP ${response.status}`
}

export const usersApi = {
  async list(): Promise<UserApiItem[]> {
    const response = await fetch(USERS_API_BASE)
    if (!response.ok) throw new Error(await parseError(response))

    const data = await response.json()
    if (!Array.isArray(data)) throw new Error('Invalid users API response')
    return data as UserApiItem[]
  },

  async add(payload: UserUpsertPayload): Promise<void> {
    const response = await fetch(`${USERS_API_BASE}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(await parseError(response))
  },

  async edit(id: number, payload: UserUpsertPayload): Promise<void> {
    const response = await fetch(`${USERS_API_BASE}/edit/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(await parseError(response))
  },
}

export default usersApi
