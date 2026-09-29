'use client'
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '../../../lib/stores/auth'
import { api } from '../../../lib/api'
import type { User } from '@propnest/shared-types'

function Spinner() {
  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted text-sm">Completing sign in…</p>
      </div>
    </div>
  )
}

function CallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    const accessToken = params.get('accessToken')
    const refreshToken = params.get('refreshToken')
    const sessionId = params.get('sessionId')

    if (!accessToken || !refreshToken || !sessionId) {
      router.replace('/login?error=oauth_failed')
      return
    }

    ;(async () => {
      try {
        const user = await api.get<User>('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
          skipAuth: true,
        })
        setAuth({ user, accessToken, refreshToken, sessionId })
        router.replace('/dashboard')
      } catch {
        router.replace('/login?error=oauth_failed')
      }
    })()
  }, [params, router, setAuth])

  return <Spinner />
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CallbackInner />
    </Suspense>
  )
}
