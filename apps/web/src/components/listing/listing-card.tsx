'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Bed, Bath, Square } from 'lucide-react'
import { cn } from '@/lib/cn'
import { StatusBadge } from '@/components/ui/badge'
interface ListingCardListing {
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
  status: string
  propertyType: string
  listedAt: string | null
  primaryImageUrl: string | null
}

interface ListingCardProps {
  listing: ListingCardListing
  priority?: boolean
  className?: string
  // Horizontal compact variant for search results list panel
  compact?: boolean
  active?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

function formatPrice(price: number): string {
  if (price >= 1_000_000) {
    return `$${(price / 1_000_000).toFixed(price % 1_000_000 === 0 ? 0 : 1)}M`
  }
  return `$${price.toLocaleString()}`
}

function daysOnMarket(listedAt: string | null): string | null {
  if (!listedAt) return null
  const days = Math.floor((Date.now() - new Date(listedAt).getTime()) / 86_400_000)
  if (days === 0) return 'Listed today'
  if (days === 1) return '1 day on market'
  return `${days} days on market`
}

export function ListingCard({
  listing,
  priority = false,
  className,
  compact = false,
  active = false,
  onMouseEnter,
  onMouseLeave,
}: ListingCardProps) {
  const [saved, setSaved] = useState(false)
  const dom = daysOnMarket(listing.listedAt ?? null)

  if (compact) {
    // Horizontal card — used in search results left panel
    return (
      <Link
        href={`/listings/${listing.slug}`}
        className={cn(
          'flex gap-3 p-3 rounded-card bg-white border transition-all duration-200 cursor-pointer',
          active
            ? 'border-navy shadow-floating'
            : 'border-border hover:border-navy/30 hover:shadow-card',
          className
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Thumbnail */}
        <div className="relative w-24 h-20 shrink-0 rounded-[6px] overflow-hidden bg-ivory-dark">
          {listing.primaryImageUrl ? (
            <Image
              src={listing.primaryImageUrl}
              alt={listing.addressLine1}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="w-full h-full bg-ivory-deeper flex items-center justify-center">
              <Square size={20} className="text-border" />
            </div>
          )}
          <StatusBadge
            status={listing.status}
            className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <p className="price text-base font-semibold truncate">
              {formatPrice(listing.price)}
            </p>
            <p className="text-xs text-muted truncate mt-0.5">
              {listing.addressLine1}, {listing.city}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Bed size={11} /> {listing.bedrooms} bd
            </span>
            <span className="flex items-center gap-1">
              <Bath size={11} /> {listing.bathrooms} ba
            </span>
            {listing.sqft && (
              <span className="flex items-center gap-1">
                <Square size={11} /> {listing.sqft.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </Link>
    )
  }

  // ── Standard vertical card ───────────────────────────────────────────────
  return (
    <article
      className={cn(
        'group relative bg-white rounded-card shadow-card overflow-hidden',
        'transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5',
        active && 'ring-2 ring-navy shadow-floating',
        className
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Image */}
      <Link href={`/listings/${listing.slug}`} className="block relative aspect-[3/2] overflow-hidden bg-ivory-dark">
        {listing.primaryImageUrl ? (
          <Image
            src={listing.primaryImageUrl}
            alt={`${listing.addressLine1} — ${listing.city}`}
            fill
            priority={priority}
            className="object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-ivory-deeper flex items-center justify-center">
            <Square size={32} className="text-border" />
          </div>
        )}

        {/* Status pill — top right */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={listing.status} />
        </div>

        {/* Save button — top left */}
        <button
          onClick={(e) => {
            e.preventDefault()
            setSaved(!saved)
          }}
          className={cn(
            'absolute top-3 left-3 p-1.5 rounded-full transition-all duration-200',
            'bg-white/80 backdrop-blur-sm hover:bg-white',
            saved ? 'text-gold' : 'text-muted hover:text-[#1A1A1A]'
          )}
          aria-label={saved ? 'Remove from saved' : 'Save listing'}
        >
          <Heart
            size={15}
            fill={saved ? 'currentColor' : 'none'}
            strokeWidth={1.5}
          />
        </button>
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Price + property type */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="price text-display-sm">
            {formatPrice(listing.price)}
          </p>
          <span className="text-label text-muted uppercase tracking-widest mt-1 shrink-0">
            {listing.propertyType.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Address */}
        <Link
          href={`/listings/${listing.slug}`}
          className="text-sm text-[#1A1A1A] hover:text-navy transition-colors line-clamp-1 font-medium"
        >
          {listing.addressLine1}
        </Link>
        <p className="text-sm text-muted mt-0.5">
          {listing.city}, {listing.state} {listing.zip}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/60">
          <span className="flex items-center gap-1.5 text-sm text-[#1A1A1A]">
            <Bed size={14} className="text-muted shrink-0" />
            <span>{listing.bedrooms} <span className="text-muted">bd</span></span>
          </span>
          <span className="flex items-center gap-1.5 text-sm text-[#1A1A1A]">
            <Bath size={14} className="text-muted shrink-0" />
            <span>{listing.bathrooms} <span className="text-muted">ba</span></span>
          </span>
          {listing.sqft && (
            <span className="flex items-center gap-1.5 text-sm text-[#1A1A1A]">
              <Square size={14} className="text-muted shrink-0" />
              <span>{listing.sqft.toLocaleString()} <span className="text-muted">sqft</span></span>
            </span>
          )}

          {/* Days on market — pushed right */}
          {dom && (
            <span className="ml-auto text-xs text-muted">{dom}</span>
          )}
        </div>
      </div>
    </article>
  )
}
