'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '../lib/stores/auth'
import type { UserRole } from '@propnest/shared-types'

export function useRequireRole(...roles: UserRole[]) {
  const router = useRouter()
  const { user, accessToken } = useAuthStore()

  useEffect(() => {
    if (!accessToken || !user) {
      router.replace('/login')
      return
    }
    if (roles.length > 0 && !roles.includes(user.role as UserRole)) {
      router.replace('/dashboard')
    }
  }, [accessToken, user, router])

  return { user, isLoading: !user && !accessToken }
}
