/**
 * API Service Module
 * Handles all HTTP requests to backend API
 * 
 * Usage:
 *   import { apiService } from '@/services/api'
 *   
 *   // GET request
 *   const data = await apiService.get('/people')
 *   
 *   // POST request
 *   const response = await apiService.post('/voting', { email: 'test@example.com', vote: 'yes' })
 *   
 *   // PUT request
 *   const updated = await apiService.put('/people/1', { name: 'New Name' })
 *   
 *   // DELETE request
 *   await apiService.delete('/places/1')
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:7079/api'

interface RequestOptions extends RequestInit {
  timeout?: number
}

/**
 * Make a fetch request with error handling and timeout
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeout = 10000, ...fetchOptions } = options
  const url = `${API_BASE_URL}${endpoint}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`)
      }
      throw error
    }
    throw new Error('Unknown error occurred')
  }
}

/**
 * API Service - main export with all HTTP methods
 */
export const apiService = {
  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'GET',
    })
  },

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    })
  },
}

export default apiService
