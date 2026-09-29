import React from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  Bed, Bath, Square, Calendar, MapPin, Phone,
  ChevronLeft, Home, Zap
} from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { StatusBadge } from '@/components/ui/badge'
import { ListingActions } from './listing-actions'
import { ListingControls } from './listing-controls'

interface ListingDetail {
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
  yearBuilt: number | null
  propertyType: string
  status: string
  description: string | null
  features: string[]
  listedAt: string | null
  hoaMonthly: number | null
  agent: {
    firstName: string
    lastName: string
    phone: string | null
    agencyName: string
    avatarUrl: string | null
  } | null
  images: { url: string; alt: string }[]
}

async function getListing(slug: string): Promise<ListingDetail | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${apiUrl}/listings/slug/${slug}`, {
      next: { revalidate: 60 },
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`API error ${res.status}`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d: any = await res.json()

    const rawFeatures = d.features ?? {}
    const features: string[] = Array.isArray(rawFeatures)
      ? rawFeatures
      : Object.keys(rawFeatures).filter((k) => rawFeatures[k])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const images = (d.images ?? []).map((img: any) => ({
      url: img.url,
      alt: img.alt ?? (d.address_line1 ?? d.addressLine1 ?? ''),
    }))

    const agent = d.agent
      ? {
          firstName: d.agent.first_name ?? d.agent.firstName,
          lastName: d.agent.last_name ?? d.agent.lastName,
          phone: d.agent.phone ?? null,
          agencyName: d.agent.agency_name ?? d.agent.agencyName ?? '',
          avatarUrl: d.agent.avatar_url ?? d.agent.avatarUrl ?? null,
        }
      : null

    return {
      id: d.id,
      slug: d.slug,
      addressLine1: d.address_line1 ?? d.addressLine1,
      city: d.city,
      state: d.state,
      zip: d.zip,
      price: Number(d.price),
      bedrooms: d.bedrooms,
      bathrooms: Number(d.bathrooms),
      sqft: d.sqft,
      yearBuilt: d.year_built ?? d.yearBuilt ?? null,
      propertyType: d.property_type ?? d.propertyType,
      status: d.status,
      description: d.description ?? null,
      features,
      listedAt: d.listed_at ?? d.listedAt ?? null,
      hoaMonthly: d.hoa_monthly ?? d.hoaMonthly ?? null,
      agent,
      images,
    }
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const listing = await getListing(slug)
  if (!listing) return {}

  const title = `${listing.bedrooms}BR ${listing.propertyType.replace('_', ' ')} at ${listing.addressLine1} – $${(listing.price / 1_000_000).toFixed(1)}M`
  const description = listing.description?.slice(0, 155) ?? title

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: listing.images[0] ? [{ url: listing.images[0].url, width: 1200, height: 800 }] : [],
      type: 'website',
    },
  }
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const listing = await getListing(slug)
  if (!listing) notFound()

  const primaryImage = listing.images[0]
  const thumbImages = listing.images.slice(1, 4)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">

        {/* ── Back nav ────────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-border">
          <div className="max-w-8xl mx-auto px-5 md:px-8 py-3 flex items-center gap-2">
            <Link
              href="/search"
              className="flex items-center gap-1.5 text-sm text-muted hover:text-navy transition-colors"
            >
              <ChevronLeft size={15} />
              Back to search
            </Link>
          </div>
        </div>

        {/* ── Image gallery ───────────────────────────────────────────────── */}
        <section className="bg-[#1A1A1A]">
          <div className="max-w-8xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-px">
              {/* Primary image */}
              <div className="relative md:col-span-2 aspect-[4/3] md:aspect-auto md:h-[520px] overflow-hidden">
                {primaryImage ? (
                  <Image
                    src={primaryImage.url}
                    alt={primaryImage.alt}
                    fill
                    priority
                    className="object-cover hover:scale-[1.01] transition-transform duration-700 ease-out"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="w-full h-full bg-navy-800 flex items-center justify-center">
                    <Home size={48} className="text-white/20" />
                  </div>
                )}
              </div>

              {/* Thumbnail grid — desktop only */}
              <div className="hidden md:grid col-span-2 grid-cols-2 gap-px">
                {thumbImages.map((img, i) => (
                  <div key={i} className="relative overflow-hidden">
                    <Image
                      src={img.url}
                      alt={img.alt}
                      fill
                      className="object-cover hover:scale-[1.02] transition-transform duration-500 ease-out"
                      sizes="25vw"
                    />
                    {/* "View all" overlay on last thumb */}
                    {i === thumbImages.length - 1 && listing.images.length > 4 && (
                      <div className="absolute inset-0 bg-navy/60 flex items-center justify-center cursor-pointer hover:bg-navy/70 transition-colors">
                        <p className="text-white font-medium text-sm">
                          +{listing.images.length - 4} photos
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Main content ────────────────────────────────────────────────── */}
        <div className="max-w-8xl mx-auto px-5 md:px-8 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 lg:gap-16">

            {/* Left — content */}
            <div>
              {/* Address + status */}
              <div className="flex items-start justify-between gap-4 mb-1">
                <StatusBadge status={listing.status} />
                <ListingControls
                  title={`${listing.addressLine1} – $${listing.price.toLocaleString()} | PropNest`}
                  slug={listing.slug}
                />
              </div>

              <h1 className="font-sans font-semibold text-heading-xl text-[#1A1A1A] mt-3 mb-1">
                {listing.addressLine1}
              </h1>
              <p className="text-muted flex items-center gap-1.5 mb-6">
                <MapPin size={14} />
                {listing.city}, {listing.state} {listing.zip}
              </p>

              {/* Key stats */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 py-6 border-y border-border mb-8">
                <Stat icon={<Bed size={16} />} value={listing.bedrooms} label="Bedrooms" />
                <Stat icon={<Bath size={16} />} value={listing.bathrooms} label="Bathrooms" />
                <Stat icon={<Square size={16} />} value={`${listing.sqft.toLocaleString()}`} label="Sq ft" />
                <Stat icon={<Calendar size={16} />} value={listing.yearBuilt ?? '—'} label="Built" />
              </div>

              {/* Description */}
              <section className="mb-8">
                <h2 className="font-sans font-semibold text-heading-lg text-[#1A1A1A] mb-3">
                  About this home
                </h2>
                <p className="text-[#1A1A1A] leading-relaxed text-[15px]">
                  {listing.description ?? 'No description provided.'}
                </p>
              </section>

              {/* Features */}
              <section className="mb-8">
                <h2 className="font-sans font-semibold text-heading-lg text-[#1A1A1A] mb-4">
                  Features & amenities
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {listing.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2.5 text-sm text-[#1A1A1A]">
                      <Zap size={13} className="text-gold shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
              </section>

              {/* Property details */}
              <section>
                <h2 className="font-sans font-semibold text-heading-lg text-[#1A1A1A] mb-4">
                  Property details
                </h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  {[
                    { label: 'Property type', value: listing.propertyType.replace('_', ' ') },
                    { label: 'Year built', value: listing.yearBuilt },
                    { label: 'Square footage', value: `${listing.sqft.toLocaleString()} sqft` },
                    { label: 'HOA',  value: listing.hoaMonthly ? `$${listing.hoaMonthly}/mo` : 'None' },
                    { label: 'Status', value: listing.status.charAt(0).toUpperCase() + listing.status.slice(1) },
                    { label: 'Listed', value: listing.listedAt ? new Date(listing.listedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between py-2.5 border-b border-border/50">
                      <span className="text-muted">{label}</span>
                      <span className="font-medium text-[#1A1A1A] capitalize">{value}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right — sticky sidebar */}
            <div>
              <div className="sticky top-6 bg-white rounded-modal shadow-modal border border-border overflow-hidden">
                {/* Price */}
                <div className="px-6 pt-6 pb-4 border-b border-border">
                  <p className="font-display font-bold text-navy" style={{ fontSize: '2rem', lineHeight: 1.1 }}>
                    ${listing.price.toLocaleString()}
                  </p>
                  <p className="text-muted text-sm mt-1">
                    ${Math.round(listing.price / listing.sqft).toLocaleString()} / sqft
                  </p>
                </div>

                {/* CTAs */}
                <div className="px-6 py-5">
                  <ListingActions
                    listing={{
                      id: listing.id,
                      addressLine1: listing.addressLine1,
                      city: listing.city,
                      state: listing.state,
                      price: listing.price,
                      bedrooms: listing.bedrooms,
                      bathrooms: listing.bathrooms,
                      sqft: listing.sqft,
                    }}
                    status={listing.status}
                  />
                </div>

                {/* Agent card */}
                {listing.agent && (
                  <div className="px-6 pb-6 pt-2 border-t border-border">
                    <p className="text-label uppercase tracking-widest text-muted mb-3">Listed by</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center shrink-0">
                        <span className="text-white text-sm font-semibold">
                          {listing.agent.firstName[0]}{listing.agent.lastName[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-[#1A1A1A] truncate">
                          {listing.agent.firstName} {listing.agent.lastName}
                        </p>
                        <p className="text-xs text-muted truncate">{listing.agent.agencyName}</p>
                      </div>
                    </div>
                    {listing.agent.phone && (
                      <a
                        href={`tel:${listing.agent.phone}`}
                        className="mt-3 flex items-center gap-2 text-sm text-navy hover:text-navy/70 transition-colors"
                      >
                        <Phone size={13} />
                        {listing.agent.phone}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string | number
  label: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted">{icon}</div>
      <p className="font-semibold text-lg text-[#1A1A1A]">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}
