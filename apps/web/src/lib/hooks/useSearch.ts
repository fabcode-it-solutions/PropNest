import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { SearchFilters, ListingStatus } from '@propnest/shared-types'

export interface SearchListing {
  id: string
  slug: string
  addressLine1: string
  city: string
  state: string
  zip: string
  price: number
  bedrooms: number
  bathrooms: number
  sqft: number
  status: ListingStatus
  propertyType: string
  primaryImageUrl: string | null
  images: { url: string; alt: string }[]
  listedAt: string | null
  lat: number | null
  lng: number | null
  agentId: string | null
  sellerId: string
  description: string | null
  features: Record<string, unknown>
  yearBuilt: number | null
  hoaMonthly: number | null
  lotSqft: number | null
  garageSpaces: number | null
  createdAt: string
  updatedAt: string
}

interface SearchResult {
  data: SearchListing[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface SearchParams {
  filters: SearchFilters
  page?: number
  pageSize?: number
  sortBy?: 'price_asc' | 'price_desc' | 'listed_at_desc' | 'relevance'
}

export function useSearch(params: SearchParams, enabled = true) {
  return useQuery<SearchResult>({
    queryKey: ['search', params],
    queryFn: () =>
      api.post<SearchResult>('/search/listings', {
        filters: params.filters,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        sortBy: params.sortBy ?? 'listed_at_desc',
      }),
    enabled,
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  })
}

export function useSuggest(q: string) {
  return useQuery<{ city?: string; state?: string; zip?: string; addressLine1?: string; slug?: string }[]>({
    queryKey: ['suggest', q],
    queryFn: () => api.get(`/search/suggest?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
    staleTime: 30_000,
  })
}
