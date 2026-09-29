'use client'

import React, { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import {
  LayoutDashboard, Plus, TrendingUp,
  Eye, Heart, Calendar, DollarSign, ChevronRight,
  CheckCircle2, AlertCircle, Clock, X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { useRequireRole } from '@/hooks/useRequireRole'
import { useListings, useUpdateListing } from '@/lib/hooks/useListings'
import { useListingOffers, useRespondToOffer } from '@/lib/hooks/useOffers'
import { useAuthStore } from '@/lib/stores/auth'
import type { Listing as APIListing, Offer as APIOffer } from '@propnest/shared-types'

const navItems = [
  { label: 'My Listings', href: '/seller', icon: LayoutDashboard },
  { label: 'Analytics',   href: '/seller', icon: TrendingUp },
  { label: 'Showings',    href: '/seller', icon: Calendar },
  { label: 'Offers',      href: '/seller', icon: DollarSign },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysOnMarket(listedAt: string | null): number {
  if (!listedAt) return 0
  return Math.floor((Date.now() - new Date(listedAt).getTime()) / 86_400_000)
}

const STATUS_STYLES: Record<string, string> = {
  draft:     'text-muted bg-border',
  active:    'text-[#16A34A] bg-green-50',
  pending:   'text-[#D97706] bg-amber-50',
  sold:      'text-navy bg-navy/10',
  withdrawn: 'text-[#DC2626] bg-red-50',
}

const OFFER_STATUS_STYLES: Record<string, string> = {
  submitted: 'text-[#0EA5E9] bg-sky-50',
  countered: 'text-[#D97706] bg-amber-50',
  accepted:  'text-[#16A34A] bg-green-50',
  rejected:  'text-[#DC2626] bg-red-50',
  withdrawn: 'text-muted bg-border',
  expired:   'text-muted bg-border',
}

function formatPrice(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  return `$${(n / 1_000).toFixed(0)}K`
}

// ── Offer review panel ────────────────────────────────────────────────────────

function OfferPanel({
  listingId,
  listingAddress,
  listingPrice,
  onClose,
}: {
  listingId: string
  listingAddress: string
  listingPrice: number
  onClose: () => void
}) {
  const { data: offersData, isLoading } = useListingOffers(listingId)
  const [selectedOffer, setSelectedOffer] = useState<APIOffer | null>(null)
  const offer = selectedOffer ?? offersData?.data?.[0] ?? null

  const [action, setAction] = useState<'accept' | 'counter' | 'reject' | null>(null)
  const [counterPrice, setCounterPrice] = useState(listingPrice.toString())
  const respondToOffer = useRespondToOffer(offer?.id ?? '')

  const done = respondToOffer.isSuccess

  function handleAction(a: 'accept' | 'counter' | 'reject') {
    setAction(a)
  }

  async function handleConfirm() {
    if (!offer) return
    await respondToOffer.mutateAsync({
      action: action === 'counter' ? 'counter' : action === 'accept' ? 'accept' : 'reject',
      counterPrice: action === 'counter' ? parseInt(counterPrice.replace(/[,$]/g, ''), 10) : undefined,
    })
  }

  const contingencies = offer ? [
    offer.financingContingency && 'Financing',
    offer.inspectionContingency && 'Inspection',
    offer.appraisalContingency && 'Appraisal',
  ].filter(Boolean).join(', ') || 'None (clean offer)' : ''

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-lg bg-white shadow-modal h-full flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-sans font-semibold text-heading-md text-[#1A1A1A]">
              {offersData?.total ?? 0} Offer{offersData?.total !== 1 ? 's' : ''}
            </h2>
            <p className="text-sm text-muted mt-0.5">{listingAddress}</p>
          </div>
          <button onClick={onClose} className="p-2 text-muted hover:text-[#1A1A1A] rounded-card hover:bg-ivory-dark transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Offer selector when multiple offers */}
        {(offersData?.data?.length ?? 0) > 1 && (
          <div className="px-6 pt-4 flex gap-2 overflow-x-auto pb-2 border-b border-border shrink-0">
            {offersData!.data.map((o, i) => (
              <button
                key={o.id}
                onClick={() => { setSelectedOffer(o); setAction(null) }}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-pill text-xs font-medium border transition-colors',
                  offer?.id === o.id ? 'bg-navy border-navy text-white' : 'border-border text-muted hover:border-navy/30'
                )}
              >
                Offer {i + 1} — {formatPrice(o.price)}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
          {isLoading && <p className="text-sm text-muted text-center py-12">Loading offers…</p>}

          {!isLoading && !offer && (
            <p className="text-sm text-muted text-center py-12">No offers on this listing yet.</p>
          )}

          {offer && (done ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-[#16A34A]/10 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-[#16A34A]" />
              </div>
              <p className="font-display text-display-sm text-navy">Response sent</p>
              <p className="text-sm text-muted">The buyer and their agent have been notified.</p>
              <Button variant="outline" size="md" onClick={onClose}>Close</Button>
            </div>
          ) : (
            <>
              {/* Offer summary */}
              <div className="bg-ivory-dark rounded-card border border-border overflow-hidden">
                {[
                  { label: 'Offer Price', value: `$${offer.price.toLocaleString()}`, highlight: true },
                  { label: 'Your List Price', value: `$${listingPrice.toLocaleString()}` },
                  { label: 'Difference', value: `${offer.price >= listingPrice ? '+' : ''}${(((offer.price - listingPrice) / listingPrice) * 100).toFixed(1)}%` },
                  { label: 'Earnest Money', value: `$${offer.earnestMoney.toLocaleString()}` },
                  { label: 'Closing Date', value: offer.closingDate },
                  { label: 'Contingencies', value: contingencies },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0">
                    <span className="text-xs text-muted">{label}</span>
                    <span className={cn('text-sm font-medium', highlight && 'font-display text-navy text-base')}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Buyer message */}
              {offer.message && (
                <div className="bg-ivory-dark rounded-card border border-border p-4">
                  <p className="text-label uppercase tracking-widest text-muted text-[11px] mb-2">Buyer&apos;s Message</p>
                  <p className="text-sm text-[#1A1A1A] leading-relaxed italic">&ldquo;{offer.message}&rdquo;</p>
                </div>
              )}

              {respondToOffer.error && (
                <p className="text-xs text-error text-center">{(respondToOffer.error as Error).message}</p>
              )}

              {/* Actions */}
              {(offer.status === 'submitted' || offer.status === 'countered') ? (
                action === null ? (
                  <div className="space-y-2">
                    <Button variant="primary" size="md" className="w-full" onClick={() => handleAction('accept')}>
                      <CheckCircle2 size={15} className="mr-2" />
                      Accept Offer
                    </Button>
                    <Button variant="navy" size="md" className="w-full" onClick={() => handleAction('counter')}>
                      Counter Offer
                    </Button>
                    <Button variant="outline" size="md" className="w-full" onClick={() => handleAction('reject')}>
                      Decline
                    </Button>
                  </div>
                ) : action === 'accept' ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-card p-3 text-sm text-[#16A34A]">
                      Accepting this offer will advance the listing to Pending status and notify all parties.
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="md" onClick={() => setAction(null)}>Back</Button>
                      <Button variant="primary" size="md" className="flex-1" loading={respondToOffer.isPending} onClick={handleConfirm}>
                        Confirm Accept
                      </Button>
                    </div>
                  </div>
                ) : action === 'counter' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-label uppercase tracking-widest text-muted text-[11px] mb-2 block">
                        Counter Price
                      </label>
                      <div className="relative">
                        <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                          type="text"
                          value={counterPrice}
                          onChange={(e) => setCounterPrice(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 border border-border rounded-card text-sm focus:outline-none focus:ring-1 focus:ring-navy/40 focus:border-navy/40"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="md" onClick={() => setAction(null)}>Back</Button>
                      <Button variant="navy" size="md" className="flex-1" loading={respondToOffer.isPending} onClick={handleConfirm}>
                        Send Counter
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-red-50 border border-red-200 rounded-card p-3 text-sm text-[#DC2626]">
                      The buyer and their agent will be notified that this offer was declined.
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="md" onClick={() => setAction(null)}>Back</Button>
                      <Button variant="destructive" size="md" className="flex-1" loading={respondToOffer.isPending} onClick={handleConfirm}>
                        Confirm Decline
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-6 text-sm text-muted">
                  This offer is <span className="font-medium capitalize">{offer.status}</span>.
                </div>
              )}
            </>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Price adjustment modal ────────────────────────────────────────────────────

function PriceModal({
  listing,
  onClose,
}: {
  listing: APIListing
  onClose: () => void
}) {
  const [newPrice, setNewPrice] = useState(listing.price.toString())
  const updateListing = useUpdateListing(listing.id)

  async function handleSave() {
    const price = parseInt(newPrice.replace(/[,$]/g, ''), 10)
    await updateListing.mutateAsync({ price } as never)
    onClose()
  }

  const parsedPrice = parseInt(newPrice.replace(/[,$]/g, ''), 10)
  const diff = parsedPrice - listing.price
  const pct = listing.price ? ((diff / listing.price) * 100).toFixed(1) : '0'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-modal shadow-modal w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-display-sm text-navy">Adjust Price</h3>
          <button onClick={onClose} className="p-1 text-muted hover:text-[#1A1A1A] rounded">
            <X size={16} />
          </button>
        </div>

        <div className="mb-4">
          <label className="text-label uppercase tracking-widest text-muted text-[11px] mb-2 block">
            New Price
          </label>
          <div className="relative">
            <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-full pl-9 pr-3 py-3 border border-border rounded-card text-sm focus:outline-none focus:ring-1 focus:ring-navy/40 focus:border-navy/40"
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-muted">
            <span>Current: ${listing.price.toLocaleString()}</span>
            {!isNaN(parsedPrice) && parsedPrice !== listing.price && (
              <span className={diff < 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}>
                {diff > 0 ? '+' : ''}{pct}% change
              </span>
            )}
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          className="w-full"
          onClick={handleSave}
          loading={updateListing.isPending}
          disabled={isNaN(parsedPrice) || parsedPrice === listing.price}
        >
          Update Price
        </Button>
      </div>
    </div>
  )
}

// ── Listing card ──────────────────────────────────────────────────────────────

function SellerListingCard({
  listing,
  onViewOffers,
  onAdjustPrice,
}: {
  listing: APIListing
  onViewOffers: (listing: APIListing) => void
  onAdjustPrice: (listing: APIListing) => void
}) {
  const dom = daysOnMarket(listing.listedAt)

  return (
    <div className="bg-white rounded-card border border-border overflow-hidden hover:shadow-card-hover transition-shadow">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="sm:w-48 shrink-0 aspect-[3/2] sm:aspect-auto overflow-hidden bg-ivory-dark relative">
          {listing.primaryImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.primaryImageUrl} alt={listing.addressLine1} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-navy-50 flex items-center justify-center">
              <Eye size={24} className="text-navy/20" />
            </div>
          )}
          <span className={cn(
            'absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-pill capitalize',
            STATUS_STYLES[listing.status] ?? 'text-muted bg-border'
          )}>
            {listing.status}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-[#1A1A1A]">{listing.addressLine1}</p>
              <p className="text-xs text-muted mt-0.5">{listing.city}, {listing.state}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display font-bold text-navy text-lg">
                {formatPrice(listing.price)}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted">
            <span>{listing.bedrooms}bd · {listing.bathrooms}ba · {listing.sqft.toLocaleString()} sqft</span>
          </div>

          {listing.status !== 'draft' && dom > 0 && (
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex items-center gap-1 text-xs',
                dom > 30 ? 'text-[#D97706]' : 'text-muted'
              )}>
                <Clock size={12} />
                <span>{dom}d on market</span>
              </div>
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-2 mt-auto pt-1">
            {listing.status === 'draft' ? (
              <Button variant="primary" size="sm">
                Publish Listing
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => onAdjustPrice(listing)}>
                Adjust Price
              </Button>
            )}

            <Button
              variant="navy"
              size="sm"
              onClick={() => onViewOffers(listing)}
              className="relative"
            >
              View Offers
              <ChevronRight size={12} className="ml-1" />
            </Button>

            {listing.status === 'active' && dom > 30 && (
              <div className="flex items-center gap-1 text-xs text-[#D97706] ml-auto">
                <AlertCircle size={12} />
                Consider a price reduction
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SellerPage() {
  useRequireRole('seller', 'admin')

  const user = useAuthStore((s) => s.user)
  const { data: listingsData } = useListings({ sellerId: user?.id })
  const listings = listingsData?.data ?? []

  const [reviewingListingId, setReviewingListingId] = useState<string | null>(null)
  const [adjustingPrice, setAdjustingPrice] = useState<APIListing | null>(null)

  const reviewingListing = listings.find((l) => l.id === reviewingListingId) ?? null

  const activeCount  = listings.filter((l) => l.status === 'active').length
  const pendingCount = listings.filter((l) => l.status === 'pending').length

  return (
    <DashboardLayout navItems={navItems} title="Seller Dashboard" subtitle="Your Properties">
      {reviewingListingId && reviewingListing && (
        <OfferPanel
          listingId={reviewingListingId}
          listingAddress={reviewingListing.addressLine1}
          listingPrice={reviewingListing.price}
          onClose={() => setReviewingListingId(null)}
        />
      )}
      {adjustingPrice && (
        <PriceModal
          listing={adjustingPrice}
          onClose={() => setAdjustingPrice(null)}
        />
      )}

      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Listings', value: activeCount,            color: 'bg-[#16A34A]' },
            { label: 'Pending Sale',    value: pendingCount,           color: 'bg-[#D97706]' },
            { label: 'Total Listings',  value: listings.length,        color: 'bg-gold' },
            { label: 'Draft',           value: listings.filter((l) => l.status === 'draft').length, color: 'bg-navy' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-card border border-border p-4 flex gap-4 items-center">
              <div className={cn('w-2 self-stretch rounded-full shrink-0', color)} />
              <div>
                <p className="text-xl font-semibold text-[#1A1A1A]">{value}</p>
                <p className="text-xs text-muted mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Header + add listing */}
        <div className="flex items-center justify-between">
          <h2 className="font-sans font-semibold text-heading-md text-[#1A1A1A]">
            My Listings ({listings.length})
          </h2>
          <Button variant="primary" size="sm">
            <Plus size={15} className="mr-1.5" />
            New Listing
          </Button>
        </div>

        {/* Listings */}
        {listings.length === 0 ? (
          <p className="text-sm text-muted text-center py-12">You have no listings yet.</p>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => (
              <SellerListingCard
                key={listing.id}
                listing={listing}
                onViewOffers={(l) => setReviewingListingId(l.id)}
                onAdjustPrice={setAdjustingPrice}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
