'use client'

import React, { useState, useCallback } from 'react'
import { Search, SlidersHorizontal, X, ChevronDown, Map, List } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ListingCard } from '@/components/listing/listing-card'
import { ListingCardSkeleton } from '@/components/ui/skeleton'
import { Navbar } from '@/components/layout/navbar'
import { ListingsMap } from '@/components/map/listings-map'
import { useSearch } from '@/lib/hooks/useSearch'
import type { PropertyType } from '@propnest/shared-types'

// ── Types ──────────────────────────────────────────────────────────────────

interface FilterState {
  minPrice: number | null
  maxPrice: number | null
  minBedrooms: number | null
  propertyTypes: string[]
}

const PRICE_PRESETS = [
  { label: 'Under $500K',    min: null,      max: 500_000 },
  { label: '$500K – $1M',    min: 500_000,   max: 1_000_000 },
  { label: '$1M – $2M',      min: 1_000_000, max: 2_000_000 },
  { label: '$2M+',           min: 2_000_000, max: null },
]

const PROPERTY_TYPES = [
  'single_family', 'condo', 'townhouse', 'multi_family', 'land',
]

const PROPERTY_LABELS: Record<string, string> = {
  single_family: 'Single Family',
  condo: 'Condo',
  townhouse: 'Townhouse',
  multi_family: 'Multi-Family',
  land: 'Land',
}

// ── Component ─────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<FilterState>({
    minPrice: null,
    maxPrice: null,
    minBedrooms: null,
    propertyTypes: [],
  })
  const [filterOpen, setFilterOpen] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  const [activeListingId, setActiveListingId] = useState<string | null>(null)

  const { data: searchData, isFetching } = useSearch({
    filters: {
      q: query || undefined,
      minPrice: filters.minPrice ?? undefined,
      maxPrice: filters.maxPrice ?? undefined,
      minBedrooms: filters.minBedrooms ?? undefined,
      propertyTypes: filters.propertyTypes.length > 0
        ? (filters.propertyTypes as PropertyType[])
        : undefined,
    },
  })

  const listings = searchData?.data ?? []
  const totalCount = searchData?.total ?? 0

  const activeFilterCount = [
    filters.minPrice || filters.maxPrice,
    filters.minBedrooms,
    filters.propertyTypes.length > 0,
  ].filter(Boolean).length

  const togglePropertyType = useCallback((type: string) => {
    setFilters((prev) => ({
      ...prev,
      propertyTypes: prev.propertyTypes.includes(type)
        ? prev.propertyTypes.filter((t) => t !== type)
        : [...prev.propertyTypes, type],
    }))
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar />

      {/* ── Search bar strip ─────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-border px-4 py-2.5 flex items-center gap-3">
        {/* Search input */}
        <div className="flex-1 flex items-center gap-2 bg-ivory-dark rounded-card px-3.5 py-2">
          <Search size={15} className="text-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, neighborhood, or address"
            className="flex-1 text-sm bg-transparent focus:outline-none text-[#1A1A1A] placeholder:text-muted"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted hover:text-[#1A1A1A]">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter button */}
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-card border text-sm font-medium transition-colors duration-200',
            activeFilterCount > 0
              ? 'border-navy text-navy bg-navy-50'
              : 'border-border text-[#1A1A1A] hover:border-navy/30'
          )}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-navy text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Mobile: toggle map/list */}
        <div className="flex md:hidden rounded-card border border-border overflow-hidden">
          <button
            onClick={() => setMobileView('list')}
            className={cn('px-3 py-2', mobileView === 'list' ? 'bg-navy text-white' : 'text-muted')}
          >
            <List size={15} />
          </button>
          <button
            onClick={() => setMobileView('map')}
            className={cn('px-3 py-2', mobileView === 'map' ? 'bg-navy text-white' : 'text-muted')}
          >
            <Map size={15} />
          </button>
        </div>
      </div>

      {/* ── Filter drawer ─────────────────────────────────────────────────── */}
      {filterOpen && (
        <div className="shrink-0 bg-white border-b border-border px-4 py-4">
          <div className="max-w-8xl mx-auto flex flex-wrap gap-6 items-start">

            {/* Price */}
            <div className="flex flex-col gap-2">
              <p className="text-label uppercase tracking-widest text-muted">Price</p>
              <div className="flex flex-wrap gap-1.5">
                {PRICE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setFilters((prev) => ({
                      ...prev,
                      minPrice: preset.min,
                      maxPrice: preset.max,
                    }))}
                    className={cn(
                      'px-3 py-1.5 rounded-pill border text-xs font-medium transition-colors',
                      filters.minPrice === preset.min && filters.maxPrice === preset.max
                        ? 'border-navy bg-navy text-white'
                        : 'border-border text-[#1A1A1A] hover:border-navy/30'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bedrooms */}
            <div className="flex flex-col gap-2">
              <p className="text-label uppercase tracking-widest text-muted">Bedrooms</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setFilters((prev) => ({
                      ...prev,
                      minBedrooms: prev.minBedrooms === n ? null : n,
                    }))}
                    className={cn(
                      'w-9 h-9 rounded-pill border text-sm font-medium transition-colors',
                      filters.minBedrooms === n
                        ? 'border-navy bg-navy text-white'
                        : 'border-border text-[#1A1A1A] hover:border-navy/30'
                    )}
                  >
                    {n}+
                  </button>
                ))}
              </div>
            </div>

            {/* Property type */}
            <div className="flex flex-col gap-2">
              <p className="text-label uppercase tracking-widest text-muted">Type</p>
              <div className="flex flex-wrap gap-1.5">
                {PROPERTY_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => togglePropertyType(type)}
                    className={cn(
                      'px-3 py-1.5 rounded-pill border text-xs font-medium transition-colors',
                      filters.propertyTypes.includes(type)
                        ? 'border-navy bg-navy text-white'
                        : 'border-border text-[#1A1A1A] hover:border-navy/30'
                    )}
                  >
                    {PROPERTY_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters({ minPrice: null, maxPrice: null, minBedrooms: null, propertyTypes: [] })}
                className="text-sm text-muted hover:text-error transition-colors mt-6"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Main split view ───────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left panel — listing cards */}
        <div
          className={cn(
            'flex flex-col border-r border-border bg-ivory-dark overflow-hidden',
            'w-full md:w-[400px] lg:w-[440px] shrink-0',
            mobileView === 'map' && 'hidden md:flex'
          )}
        >
          {/* Result count + sort */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white">
            <p className="text-sm text-muted">
              <span className="font-semibold text-[#1A1A1A]">{totalCount}</span> homes
            </p>
            <button className="flex items-center gap-1 text-sm text-muted hover:text-[#1A1A1A] transition-colors">
              Newest first <ChevronDown size={13} />
            </button>
          </div>

          {/* Cards — scrollable */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isFetching && listings.length === 0
              ? Array.from({ length: 6 }).map((_, i) => <ListingCardSkeleton key={i} />)
              : listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    compact
                    active={activeListingId === listing.id}
                    onMouseEnter={() => setActiveListingId(listing.id)}
                    onMouseLeave={() => setActiveListingId(null)}
                  />
                ))
            }
          </div>
        </div>

        {/* Right — Mapbox map */}
        <div
          className={cn(
            'flex-1 relative',
            mobileView === 'list' && 'hidden md:block'
          )}
        >
          <ListingsMap
            listings={listings
              .filter((l) => l.lat != null && l.lng != null)
              .map((l) => ({
                id: l.id,
                lat: l.lat!,
                lng: l.lng!,
                price: l.price,
                status: l.status,
              }))}
            activeId={activeListingId}
            onPinClick={setActiveListingId}
            onPinHover={setActiveListingId}
          />
        </div>
      </div>
    </div>
  )
}
