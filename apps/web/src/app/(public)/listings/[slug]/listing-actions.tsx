'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { OfferModal } from '@/components/offer/offer-modal'

interface ListingActionsProps {
  listing: {
    id: string
    addressLine1: string
    city: string
    state: string
    price: number
    bedrooms: number
    bathrooms: number
    sqft: number
  }
  status: string
}

export function ListingActions({ listing, status }: ListingActionsProps) {
  const [offerOpen, setOfferOpen] = useState(false)
  const isActive = status === 'active'

  return (
    <>
      <div className="flex flex-col gap-3">
        <Button variant="primary" size="lg" className="w-full">
          Schedule a Showing
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          disabled={!isActive}
          onClick={() => setOfferOpen(true)}
        >
          {isActive ? 'Make an Offer' : 'Offer Unavailable'}
        </Button>
      </div>

      <OfferModal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        listing={listing}
      />
    </>
  )
}
