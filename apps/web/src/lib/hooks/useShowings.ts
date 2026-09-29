import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Showing {
  id: string
  listing_id: string
  buyer_id: string
  agent_id: string
  scheduled_at: string
  status: 'requested' | 'confirmed' | 'cancelled' | 'completed'
  notes: string | null
  created_at: string
}

interface ShowingsResponse {
  data: Showing[]
  total: number
}

export function useShowings(params: { status?: string; upcoming?: boolean } = {}) {
  const query = new URLSearchParams()
  if (params.status)   query.set('status', params.status)
  if (params.upcoming) query.set('upcoming', 'true')

  return useQuery<ShowingsResponse>({
    queryKey: ['showings', params],
    queryFn: () => api.get<ShowingsResponse>(`/showings?${query}`),
    staleTime: 30_000,
  })
}

export function useRequestShowing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      listingId: string
      scheduledAt: string
      notes?: string
    }) => api.post<Showing>('/showings', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['showings'] }) },
  })
}

// Agent/seller confirm a showing — PATCH /showings/:id { action: 'confirm' }
export function useConfirmShowing(showingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch<Showing>(`/showings/${showingId}`, { action: 'confirm' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['showings'] }) },
  })
}

// Agent/buyer cancel a showing — PATCH /showings/:id { action: 'cancel' }
export function useCancelShowing(showingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (_reason?: string) =>
      api.patch<Showing>(`/showings/${showingId}`, { action: 'cancel' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['showings'] }) },
  })
}
