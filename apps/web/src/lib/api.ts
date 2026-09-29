import type { AuthResponse } from '@propnest/shared-types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

type RequestOptions = RequestInit & { skipAuth?: boolean }

let refreshPromise: Promise<string> | null = null

async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem('propnest-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.accessToken ?? null
  } catch {
    return null
  }
}

async function getRefreshToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem('propnest-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.refreshToken ?? null
  } catch {
    return null
  }
}

async function doRefresh(): Promise<string> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token')

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) throw new Error('Token refresh failed')

  const data: AuthResponse = await res.json()

  // Update auth store
  const { useAuthStore } = await import('./stores/auth')
  useAuthStore.getState().setAuth({
    user: data.user,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    sessionId: (data as any).sessionId,
  })

  return data.accessToken
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options

  const headers = new Headers(fetchOptions.headers)
  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (!skipAuth) {
    const token = await getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  let response = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers })

  // Auto-refresh on 401
  if (response.status === 401 && !skipAuth) {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => { refreshPromise = null })
    }
    try {
      const newToken = await refreshPromise
      headers.set('Authorization', `Bearer ${newToken}`)
      response = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers })
    } catch {
      const { useAuthStore } = await import('./stores/auth')
      useAuthStore.getState().clearAuth()
      if (typeof window !== 'undefined') window.location.href = '/login'
      throw new Error('Session expired')
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw Object.assign(new Error(error.message ?? 'Request failed'), {
      statusCode: response.status,
      data: error,
    })
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

// Typed helpers
export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
}
