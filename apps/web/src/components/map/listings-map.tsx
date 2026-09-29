'use client'

import React, { useCallback, useRef } from 'react'
import Map, { Marker, Popup, NavigationControl, type MapRef } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { cn } from '@/lib/cn'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

interface ListingPin {
  id: string
  lat: number
  lng: number
  price: number
  status: string
}

interface ListingsMapProps {
  listings: ListingPin[]
  activeId: string | null
  onPinClick: (id: string) => void
  onPinHover: (id: string | null) => void
}

function formatPriceShort(p: number): string {
  if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(1)}M`
  return `$${Math.round(p / 1_000)}K`
}

export function ListingsMap({ listings, activeId, onPinClick, onPinHover }: ListingsMapProps) {
  const mapRef = useRef<MapRef>(null)

  const handleMove = useCallback(() => {}, [])

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full bg-[#e8e4dc] flex flex-col items-center justify-center gap-3 text-muted">
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        <p className="text-sm text-center max-w-[200px]">
          Set <code className="text-xs bg-ivory-dark px-1 py-0.5 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable map
        </p>
      </div>
    )
  }

  // Default to Bay Area
  const initialViewState = {
    longitude: -122.43,
    latitude: 37.77,
    zoom: 11,
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={initialViewState}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      onMove={handleMove}
    >
      <NavigationControl position="top-right" showCompass={false} />

      {listings.map((listing) => (
        <Marker
          key={listing.id}
          longitude={listing.lng}
          latitude={listing.lat}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation()
            onPinClick(listing.id)
          }}
        >
          <div
            onMouseEnter={() => onPinHover(listing.id)}
            onMouseLeave={() => onPinHover(null)}
            className={cn(
              'px-2 py-1 rounded-pill text-xs font-semibold shadow-floating cursor-pointer select-none',
              'transition-all duration-150 whitespace-nowrap',
              activeId === listing.id
                ? 'bg-navy text-white scale-110 shadow-modal'
                : listing.status === 'pending'
                ? 'bg-[#D97706] text-white'
                : 'bg-white text-navy hover:bg-navy hover:text-white'
            )}
          >
            {formatPriceShort(listing.price)}
          </div>
        </Marker>
      ))}
    </Map>
  )
}
