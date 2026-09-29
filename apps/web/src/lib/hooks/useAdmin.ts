import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { User } from '@propnest/shared-types'

interface AdminStats {
  totalUsers: number
  usersByRole: Record<string, number>
  activeListings: number
  newListingsToday: number
  openMortgages: number
  pendingDocsMortgages: number
  closedTransactions: number
}

interface QueueStats {
  name: string
  active: number
  waiting: number
  failed: number
  completed: number
}

interface AdminUsersResponse {
  data: (User & { joined?: string })[]
  total: number
  page: number
  totalPages: number
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get<AdminStats>('/admin/stats'),
    staleTime: 60_000,
  })
}

export function useAdminQueues() {
  return useQuery<QueueStats[]>({
    queryKey: ['admin', 'queues'],
    queryFn: () => api.get<QueueStats[]>('/admin/queues'),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useRetryQueue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (queueName: string) =>
      api.post(`/admin/queues/${queueName}/retry-failed`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'queues'] })
    },
  })
}

export function useAdminUsers(params: { page?: number; role?: string; search?: string } = {}) {
  const query = new URLSearchParams()
  if (params.page)   query.set('page', String(params.page))
  if (params.role)   query.set('role', params.role)
  if (params.search) query.set('search', params.search)

  return useQuery<AdminUsersResponse>({
    queryKey: ['admin', 'users', params],
    queryFn: () => api.get<AdminUsersResponse>(`/admin/users?${query}`),
    staleTime: 30_000,
  })
}

export function useUpdateAdminUser(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { role?: string; isActive?: boolean }) =>
      api.patch(`/admin/users/${userId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}
