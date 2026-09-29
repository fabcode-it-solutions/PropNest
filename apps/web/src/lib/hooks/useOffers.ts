import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Offer } from '@propnest/shared-types'

interface OfferResponse {
  data: Offer[]
  total: number
}

// Offers on a specific listing (agent/seller view)
export function useListingOffers(listingId: string) {
  return useQuery<OfferResponse>({
    queryKey: ['offers', 'listing', listingId],
    queryFn: () => api.get<OfferResponse>(`/listings/${listingId}/offers`),
    enabled: Boolean(listingId),
    staleTime: 15_000,
  })
}

// Buyer's own offers — GET /offers (API filters by userId automatically)
export function useMyOffers() {
  return useQuery<OfferResponse>({
    queryKey: ['offers', 'mine'],
    queryFn: () => api.get<OfferResponse>('/offers'),
    staleTime: 30_000,
  })
}

interface SubmitOfferBody {
  price: number
  closingDate: string
  earnestMoney: number
  financingContingency: boolean
  inspectionContingency: boolean
  appraisalContingency: boolean
  message?: string
  idempotencyKey: string
}

export function useSubmitOffer(listingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SubmitOfferBody) =>
      api.post<Offer>(`/listings/${listingId}/offers`, body, {
        headers: { 'Idempotency-Key': body.idempotencyKey },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] })
    },
  })
}

// Dispatch to the correct endpoint based on action
export function useRespondToOffer(offerId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      action: 'accept' | 'reject' | 'counter'
      counterPrice?: number
      closingDate?: string
      earnestMoney?: number
    }) => {
      if (body.action === 'accept') {
        return api.post<Offer>(`/offers/${offerId}/accept`, {})
      }
      if (body.action === 'reject') {
        return api.post<Offer>(`/offers/${offerId}/reject`, {})
      }
      // counter
      return api.post<Offer>(`/offers/${offerId}/counter`, {
        price: body.counterPrice,
        closingDate: body.closingDate,
        earnestMoney: body.earnestMoney,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers'] })
    },
  })
}
