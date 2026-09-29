import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface CRMDeal {
  id: string
  address: string
  city: string
  buyerName: string
  price: number
  stage: 'offer_pending' | 'in_escrow' | 'closing' | 'closed'
  daysStale: number
  lastActivity: string
}

interface CRMShowing {
  id: string
  time: string
  address: string
  buyerName: string
}

interface CRMNeedsResponse {
  id: string
  address: string
  type: string
  amount?: number
}

interface CRMOverview {
  deals: CRMDeal[]
  todayShowings: CRMShowing[]
  needsResponse: CRMNeedsResponse[]
}

export function useCRMOverview() {
  return useQuery<CRMOverview>({
    queryKey: ['crm', 'overview'],
    queryFn: () => api.get<CRMOverview>('/crm/overview'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}
