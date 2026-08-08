export type UserApiItem = {
  userId?: number
  firstName?: string
  lastName?: string
  fullName?: string
  name?: string
  email?: string
  id?: number
  active?: boolean
}

export type UserUpsertPayload = {
  firstName: string
  lastName: string
  fullName: string
  email: string
  active?: boolean
}

const API_BASE = (import.meta?.env?.VITE_API_BASE as string) || 'https://localhost:7079'
const USERS_API_BASE = `${API_BASE}/api/admin/Users`

function normalizeUserPayload(payload: UserUpsertPayload): UserUpsertPayload {
  return {
    ...payload,
    active: typeof payload.active === 'boolean' ? payload.active : true,
  }
}

async function parseError(response: Response): Promise<string> {
  const text = await response.text().catch(() => '')
  return text || `HTTP ${response.status}`
}

export const usersApi = {
  async list(): Promise<UserApiItem[]> {
    const response = await fetch(USERS_API_BASE)
    if (!response.ok) throw new Error(await parseError(response))

    const payload = await response.json()
    const data = Array.isArray(payload) ? payload : (payload?.people ?? payload?.users ?? [])
    if (!Array.isArray(data)) throw new Error('Invalid users API response')

    return data.map((item: any) => {
      const email = [
        item?.email,
        item?.emailAddress,
        item?.primaryEmail,
        item?.contact?.email,
        item?.contact?.emailAddress,
      ].find((value): value is string => typeof value === 'string' && value.trim().length > 0) || ''

      const fullName = [
        item?.fullName,
        item?.name,
        [item?.firstName, item?.lastName].filter(Boolean).join(' ').trim(),
      ].find((value): value is string => typeof value === 'string' && value.trim().length > 0) || ''

      const resolvedUserId = typeof item.userId === 'number'
        ? item.userId
        : (typeof item.id === 'number' ? item.id : undefined)

      const active = [
        item?.active,
        item?.isActive,
        item?.enabled,
        item?.status === 'active',
        item?.status === 'enabled',
      ].find((value): value is boolean => typeof value === 'boolean') ?? undefined

      return {
        ...item,
        userId: resolvedUserId,
        email,
        fullName,
        active,
      } as UserApiItem
    })
  },

  async add(payload: UserUpsertPayload): Promise<void> {
    const response = await fetch(`${USERS_API_BASE}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizeUserPayload(payload)),
    })
    if (!response.ok) throw new Error(await parseError(response))
  },

  async edit(id: number, payload: UserUpsertPayload): Promise<void> {
    const response = await fetch(`${USERS_API_BASE}/edit/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizeUserPayload(payload)),
    })
    if (!response.ok) throw new Error(await parseError(response))
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${USERS_API_BASE}/delete/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) throw new Error(await parseError(response))
  },
}

export default usersApi
