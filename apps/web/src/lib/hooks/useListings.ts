import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Listing } from '@propnest/shared-types'

interface ListingsQuery {
  status?: string
  agentId?: string
  sellerId?: string
  page?: number
  limit?: number
}

interface ListingsResponse {
  data: Listing[]
  total: number
  page: number
  totalPages: number
}

export function useListings(params: ListingsQuery = {}) {
  const query = new URLSearchParams()
  if (params.status)   query.set('status', params.status)
  if (params.agentId)  query.set('agentId', params.agentId)
  if (params.sellerId) query.set('sellerId', params.sellerId)
  if (params.page)     query.set('page', String(params.page))
  if (params.limit)    query.set('limit', String(params.limit ?? 20))

  return useQuery<ListingsResponse>({
    queryKey: ['listings', params],
    queryFn: () => api.get<ListingsResponse>(`/listings?${query}`),
    staleTime: 30_000,
  })
}

export function useListing(idOrSlug: string, bySlug = false) {
  return useQuery<Listing>({
    queryKey: ['listing', idOrSlug],
    queryFn: () =>
      bySlug
        ? api.get<Listing>(`/listings/slug/${idOrSlug}`)
        : api.get<Listing>(`/listings/${idOrSlug}`),
    enabled: Boolean(idOrSlug),
    staleTime: 60_000,
  })
}

export function useCreateListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Listing>) => api.post<Listing>('/listings', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['listings'] }) },
  })
}

export function useUpdateListing(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Listing>) => api.patch<Listing>(`/listings/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listings'] })
      qc.invalidateQueries({ queryKey: ['listing', id] })
    },
  })
}
