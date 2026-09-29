'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@propnest/shared-types'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  sessionId: string | null
  setAuth: (data: { user: User; accessToken: string; refreshToken: string; sessionId: string }) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      sessionId: null,
      setAuth: ({ user, accessToken, refreshToken, sessionId }) =>
        set({ user, accessToken, refreshToken, sessionId }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, sessionId: null }),
    }),
    {
      name: 'propnest-auth',
      // Use sessionStorage for shorter-lived auth (more secure than localStorage)
      storage:
        typeof window !== 'undefined'
          ? {
              getItem: (key) => {
                const v = sessionStorage.getItem(key)
                return v ? JSON.parse(v) : null
              },
              setItem: (key, value) => sessionStorage.setItem(key, JSON.stringify(value)),
              removeItem: (key) => sessionStorage.removeItem(key),
            }
          : undefined,
    }
  )
)
