import React from 'react'
import Link from 'next/link'
import { Search, MapPin, ArrowRight, MoveRight } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

import type { Listing } from '@propnest/shared-types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapListing(r: any): Listing {
  return {
    id: r.id,
    agentId: r.agent_id ?? r.agentId,
    sellerId: r.seller_id ?? r.sellerId,
    status: r.status,
    propertyType: r.property_type ?? r.propertyType,
    addressLine1: r.address_line1 ?? r.addressLine1,
    city: r.city,
    state: r.state,
    zip: r.zip,
    lat: r.lat,
    lng: r.lng,
    price: Number(r.price),
    bedrooms: r.bedrooms,
    bathrooms: Number(r.bathrooms),
    sqft: r.sqft,
    yearBuilt: r.year_built ?? r.yearBuilt ?? null,
    description: r.description ?? null,
    features: r.features ?? {},
    slug: r.slug,
    hoaMonthly: r.hoa_monthly ?? r.hoaMonthly ?? null,
    primaryImageUrl: r.primary_image_url ?? r.primaryImageUrl ?? null,
    listedAt: r.listed_at ?? r.listedAt ?? null,
    pendingAt: r.pending_at ?? r.pendingAt ?? null,
    soldAt: r.sold_at ?? r.soldAt ?? null,
    createdAt: r.created_at ?? r.createdAt,
    updatedAt: r.updated_at ?? r.updatedAt,
  }
}

async function getFeaturedListings(): Promise<Listing[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${apiUrl}/listings?status=active&limit=3&sortBy=listed_at_desc`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.data ?? []).map(mapListing)
  } catch {
    return []
  }
}

const HOW_IT_WORKS = [
  {
    number: '01',
    title: 'Search & Discover',
    description: 'Browse thousands of listings with our interactive map. Filter by price, neighborhood, features, and draw your own search area.',
  },
  {
    number: '02',
    title: 'Connect & Offer',
    description: 'Schedule showings, make offers, and negotiate with a full counter-offer chain — all in one place, with real-time updates.',
  },
  {
    number: '03',
    title: 'Finance & Close',
    description: 'Track your mortgage application stage by stage, upload documents securely, and receive your pre-approval letter instantly.',
  },
]

const STATS = [
  { value: '12,000+', label: 'Active listings' },
  { value: '850+',    label: 'Verified agents' },
  { value: '$4.2B',   label: 'Total homes sold' },
]

export default async function HomePage() {
  const featuredListings = await getFeaturedListings()
  const [hero, ...rest] = featuredListings

  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      <Navbar />

      <main className="flex-1">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="relative bg-[#0E1C30] overflow-hidden">
          {/* Architectural gradient depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 70% 50%, #1B2D4F 0%, #0A1520 100%)',
            }}
          />

          {/* Subtle diagonal grid lines — architectural drawing feel */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.045]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(201,168,76,1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(201,168,76,1) 1px, transparent 1px)
              `,
              backgroundSize: '80px 80px',
            }}
          />

          {/* Hero image if available — bleeds in from right */}
          {hero?.primaryImageUrl && (
            <div className="absolute inset-y-0 right-0 w-[45%] hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-r from-[#0E1C30] via-[#0E1C30]/60 to-transparent z-10" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero.primaryImageUrl}
                alt=""
                aria-hidden
                className="w-full h-full object-cover opacity-40"
                loading="eager"
              />
            </div>
          )}

          <div className="relative z-10 max-w-8xl mx-auto px-6 md:px-10 pt-20 pb-0 md:pt-28">
            <div className="max-w-3xl">

              {/* Eyebrow */}
              <div className="flex items-center gap-4 mb-10">
                <span className="block w-8 h-px bg-gold opacity-70" />
                <span
                  className="text-gold/70 font-sans font-semibold uppercase"
                  style={{ fontSize: '10px', letterSpacing: '0.2em' }}
                >
                  Real estate, reimagined
                </span>
              </div>

              {/* Headline — editorial, oversized */}
              <h1
                className="font-display text-white mb-8"
                style={{
                  fontSize: 'clamp(3.25rem, 7vw, 6rem)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.025em',
                  fontWeight: 700,
                }}
              >
                Find the home<br />
                <span
                  className="relative inline-block"
                  style={{ color: '#C9A84C' }}
                >
                  you deserve.
                </span>
              </h1>

              {/* Body */}
              <p
                className="text-white/55 mb-12 max-w-lg font-sans"
                style={{ fontSize: '1.0625rem', lineHeight: 1.75 }}
              >
                Search thousands of curated listings, connect with licensed agents,
                and navigate your entire mortgage — from application to closing — in one place.
              </p>

              {/* Search bar — flat, architectural */}
              <div className="max-w-2xl">
                <div
                  className="flex items-center bg-white overflow-hidden"
                  style={{
                    borderRadius: '4px',
                    boxShadow: '0 32px 64px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2)',
                  }}
                >
                  <div className="flex items-center flex-1 px-5 gap-3 border-r border-border">
                    <MapPin size={16} className="text-muted shrink-0" />
                    <input
                      type="text"
                      placeholder="City, neighborhood, or address"
                      className="flex-1 text-sm text-[#1A1A1A] placeholder:text-muted/70 bg-transparent focus:outline-none py-4"
                    />
                  </div>
                  <Link
                    href="/search"
                    className="flex items-center gap-2.5 px-6 py-4 bg-gold text-white font-sans font-semibold text-sm shrink-0 hover:bg-gold-dark transition-colors"
                    style={{ letterSpacing: '0.02em' }}
                  >
                    <Search size={14} />
                    Search
                  </Link>
                </div>

                {/* Quick filters */}
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  {['Houses', 'Condos', 'Townhouses', 'New Listings'].map((tag) => (
                    <Link
                      key={tag}
                      href={`/search?type=${tag.toLowerCase().replace(' ', '_')}`}
                      className="px-3 py-1.5 text-white/50 border border-white/15 hover:bg-white/8 hover:text-white/80 hover:border-white/30 transition-colors font-sans"
                      style={{ fontSize: '12px', borderRadius: '3px', letterSpacing: '0.02em' }}
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats row — pinned to bottom of hero, hair-line separated */}
            <div
              className="mt-20 border-t pt-8 pb-8 grid grid-cols-3 gap-0"
              style={{ borderColor: 'rgba(255,255,255,0.1)' }}
            >
              {STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  className="text-center"
                  style={{
                    borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : undefined,
                  }}
                >
                  <p
                    className="font-display text-white font-bold"
                    style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', letterSpacing: '-0.02em' }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="text-white/40 font-sans mt-1"
                    style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Featured Listings — editorial asymmetric grid ─────────────────── */}
        {featuredListings.length > 0 && (
          <section className="py-24 md:py-32 bg-white">
            <div className="max-w-8xl mx-auto px-6 md:px-10">

              {/* Section header */}
              <div className="flex items-end justify-between mb-12">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="block w-6 h-px bg-gold" />
                    <span
                      className="text-navy/50 font-sans font-semibold uppercase"
                      style={{ fontSize: '10px', letterSpacing: '0.2em' }}
                    >
                      Just Listed
                    </span>
                  </div>
                  <h2
                    className="font-display text-navy font-bold"
                    style={{ fontSize: 'clamp(1.875rem, 3.5vw, 2.75rem)', letterSpacing: '-0.02em', lineHeight: 1.1 }}
                  >
                    Featured Properties
                  </h2>
                </div>
                <Link
                  href="/search"
                  className="hidden sm:flex items-center gap-2 text-navy/60 hover:text-navy transition-colors font-sans font-medium"
                  style={{ fontSize: '13px', letterSpacing: '0.02em' }}
                >
                  View all listings
                  <MoveRight size={14} />
                </Link>
              </div>

              {/* Asymmetric editorial grid */}
              {featuredListings.length === 3 ? (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5">
                  {/* Hero card — spans 3 columns */}
                  <HeroListingCard listing={featuredListings[0]} />

                  {/* Two stacked smaller cards */}
                  <div className="lg:col-span-2 flex flex-col gap-4 lg:gap-5">
                    {[featuredListings[1], featuredListings[2]].map((listing) => (
                      <StackedListingCard key={listing.id} listing={listing} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {featuredListings.map((listing) => (
                    <HeroListingCard key={listing.id} listing={listing} compact />
                  ))}
                </div>
              )}

              <div className="mt-6 sm:hidden">
                <Link
                  href="/search"
                  className="flex items-center justify-center gap-2 w-full py-3.5 border border-navy text-navy font-sans font-semibold text-sm hover:bg-navy hover:text-white transition-colors"
                  style={{ borderRadius: '4px' }}
                >
                  View all listings
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── How it works — numbered process with hairline ─────────────────── */}
        <section className="py-24 md:py-32 bg-ivory">
          <div className="max-w-8xl mx-auto px-6 md:px-10">

            {/* Header */}
            <div className="mb-20 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="block w-6 h-px bg-gold" />
                  <span
                    className="text-navy/50 font-sans font-semibold uppercase"
                    style={{ fontSize: '10px', letterSpacing: '0.2em' }}
                  >
                    How PropNest works
                  </span>
                </div>
                <h2
                  className="font-display text-navy font-bold"
                  style={{ fontSize: 'clamp(1.875rem, 3.5vw, 2.75rem)', letterSpacing: '-0.02em', lineHeight: 1.1 }}
                >
                  From search to closing,<br />
                  we&apos;ve got you covered.
                </h2>
              </div>
              <Link
                href="/register"
                className="hidden md:flex items-center gap-2 text-navy/60 hover:text-navy transition-colors font-sans font-medium self-end"
                style={{ fontSize: '13px' }}
              >
                Get started free
                <MoveRight size={14} />
              </Link>
            </div>

            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
              {HOW_IT_WORKS.map((step, i) => (
                <div
                  key={step.number}
                  className="relative md:pr-10 md:pl-0 pb-10 md:pb-0"
                  style={{
                    borderRight: i < 2 ? undefined : undefined,
                  }}
                >
                  {/* Connecting rule — only between steps on desktop */}
                  {i < 2 && (
                    <div
                      className="hidden md:block absolute top-5 right-0 w-10 h-px bg-border"
                      style={{ right: '-1px' }}
                    />
                  )}

                  {/* Number + hairline */}
                  <div className="flex items-center gap-4 mb-6">
                    <span
                      className="font-display text-gold font-bold"
                      style={{ fontSize: '2.25rem', lineHeight: 1, letterSpacing: '-0.03em' }}
                    >
                      {step.number}
                    </span>
                    <span className="flex-1 h-px bg-border md:hidden" />
                  </div>

                  <h3
                    className="font-sans font-semibold text-navy mb-3"
                    style={{ fontSize: '1.0625rem' }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-muted font-sans leading-relaxed"
                    style={{ fontSize: '0.9375rem' }}
                  >
                    {step.description}
                  </p>

                  {/* Vertical separator for mobile */}
                  {i < 2 && (
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-border md:hidden" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA — architectural, navy with gold accent ───────────────────── */}
        <section className="relative bg-navy overflow-hidden py-24 md:py-32">
          {/* Layered gradient for depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, #0E1C30 0%, #1B2D4F 35%, #243660 100%)',
            }}
          />

          {/* Subtle diagonal texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.08]"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 2px,
                rgba(201,168,76,0.3) 2px,
                rgba(201,168,76,0.3) 4px
              )`,
            }}
          />

          {/* Large decorative numeral — now visible */}
          <div
            className="absolute -right-16 top-1/2 -translate-y-1/2 font-display font-bold text-white/[0.09] select-none pointer-events-none hidden lg:block"
            style={{ fontSize: '32rem', lineHeight: 1, letterSpacing: '-0.05em', transform: 'translateY(-50%) scaleX(0.9)' }}
            aria-hidden
          >
            P
          </div>

          <div className="relative z-10 max-w-8xl mx-auto px-6 md:px-10">
            <div className="max-w-2xl">
              {/* Eyebrow */}
              <div className="flex items-center gap-4 mb-8">
                <span className="block w-8 h-px bg-gold opacity-70" />
                <span
                  className="text-gold/70 font-sans font-semibold uppercase"
                  style={{ fontSize: '10px', letterSpacing: '0.2em' }}
                >
                  Get started today
                </span>
              </div>

              <h2
                className="font-display text-white font-bold mb-6"
                style={{
                  fontSize: 'clamp(2.5rem, 5.5vw, 4rem)',
                  lineHeight: 1.08,
                  letterSpacing: '-0.03em',
                }}
              >
                Ready to find
                <br />
                <span style={{ color: '#E0C47A' }}>your place?</span>
              </h2>

              <p
                className="text-white/50 font-sans mb-14"
                style={{ fontSize: '1.0625rem', lineHeight: 1.8, maxWidth: '38ch' }}
              >
                Join thousands of buyers and agents who use PropNest to close deals faster, smarter, and with confidence.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-3">
                <Link
                  href="/search"
                  className="flex items-center justify-center gap-2.5 px-8 py-4 bg-gold text-navy font-sans font-semibold hover:bg-gold-light hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                  style={{ borderRadius: '4px', fontSize: '14px', letterSpacing: '0.03em', fontWeight: 600 }}
                >
                  Browse Listings
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2.5 px-8 py-4 text-white border border-white/30 font-sans font-semibold hover:bg-white/12 hover:border-white/50 transition-colors duration-200"
                  style={{ borderRadius: '4px', fontSize: '14px', letterSpacing: '0.03em' }}
                >
                  Create Free Account
                </Link>
              </div>

              {/* Trust signals — subtle but clear */}
              <div
                className="flex flex-wrap gap-x-6 gap-y-2 mt-12"
                style={{ borderTop: '1px solid rgba(201,168,76,0.2)', paddingTop: '2.5rem' }}
              >
                {['No hidden fees', 'Licensed agents only', 'Secure document vault'].map((point) => (
                  <span
                    key={point}
                    className="text-white/40 font-sans"
                    style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                  >
                    {point}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}

// ── Hero listing card (large, 3/5 grid columns) ───────────────────────────────

function HeroListingCard({
  listing,
  compact = false,
}: {
  listing: Listing
  compact?: boolean
}) {
  const priceDisplay = listing.price >= 1_000_000
    ? `$${(listing.price / 1_000_000).toFixed(listing.price % 1_000_000 === 0 ? 0 : 1)}M`
    : `$${listing.price.toLocaleString()}`

  const listedDays = listing.listedAt
    ? Math.floor((Date.now() - new Date(listing.listedAt).getTime()) / 86_400_000)
    : null

  return (
    <article
      className={`group relative overflow-hidden bg-[#0E1C30] ${compact ? '' : 'lg:col-span-3'}`}
      style={{
        borderRadius: '4px',
        aspectRatio: compact ? '3/2' : undefined,
        minHeight: compact ? undefined : '460px',
      }}
    >
      <Link href={`/listings/${listing.slug}`} className="block absolute inset-0">
        {listing.primaryImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.primaryImageUrl}
            alt={listing.addressLine1}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            loading="eager"
          />
        )}
        {/* Gradient overlay — bottom-up, editorial */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, rgba(10,18,30,0.92) 0%, rgba(10,18,30,0.3) 50%, transparent 100%)',
          }}
        />
      </Link>

      {/* Status badge — top left */}
      <div className="absolute top-4 left-4 z-10">
        <span
          className="font-sans font-semibold uppercase text-white"
          style={{
            fontSize: '9px',
            letterSpacing: '0.18em',
            background: listing.status === 'active' ? 'rgba(201,168,76,0.9)' : 'rgba(27,45,79,0.85)',
            padding: '4px 10px',
            borderRadius: '2px',
            backdropFilter: 'blur(4px)',
          }}
        >
          {listing.status === 'active' ? 'For Sale' : listing.status}
        </span>
      </div>

      {/* Content — pinned to bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <p
          className="font-display text-white font-bold mb-1"
          style={{ fontSize: compact ? '1.75rem' : '2.25rem', letterSpacing: '-0.02em', lineHeight: 1 }}
        >
          {priceDisplay}
        </p>
        <Link
          href={`/listings/${listing.slug}`}
          className="text-white/80 font-sans hover:text-white transition-colors block mb-3"
          style={{ fontSize: '14px' }}
        >
          {listing.addressLine1}, {listing.city}, {listing.state}
        </Link>
        <div className="flex items-center gap-4">
          {[
            `${listing.bedrooms} bd`,
            `${listing.bathrooms} ba`,
            `${listing.sqft.toLocaleString()} sqft`,
          ].map((spec) => (
            <span key={spec} className="text-white/50 font-sans" style={{ fontSize: '12px', letterSpacing: '0.04em' }}>
              {spec}
            </span>
          ))}
          {listedDays !== null && (
            <span className="ml-auto text-white/35 font-sans" style={{ fontSize: '11px' }}>
              {listedDays === 0 ? 'Today' : `${listedDays}d ago`}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

// ── Stacked listing card (small, 2/5 grid columns) ────────────────────────────

function StackedListingCard({ listing }: { listing: Listing }) {
  const priceDisplay = listing.price >= 1_000_000
    ? `$${(listing.price / 1_000_000).toFixed(listing.price % 1_000_000 === 0 ? 0 : 1)}M`
    : `$${listing.price.toLocaleString()}`

  return (
    <article
      className="group flex overflow-hidden bg-white border border-border hover:border-navy/20 transition-colors"
      style={{ borderRadius: '4px', flex: 1 }}
    >
      {/* Thumbnail */}
      <Link
        href={`/listings/${listing.slug}`}
        className="relative w-36 shrink-0 overflow-hidden bg-ivory-dark"
      >
        {listing.primaryImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.primaryImageUrl}
            alt={listing.addressLine1}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-navy/5" />
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-col justify-center p-4 min-w-0">
        <p
          className="font-display text-navy font-bold mb-1"
          style={{ fontSize: '1.375rem', letterSpacing: '-0.02em', lineHeight: 1 }}
        >
          {priceDisplay}
        </p>
        <Link
          href={`/listings/${listing.slug}`}
          className="text-[#1A1A1A] hover:text-navy transition-colors truncate font-sans font-medium mb-1"
          style={{ fontSize: '13px' }}
        >
          {listing.addressLine1}
        </Link>
        <p className="text-muted font-sans truncate mb-3" style={{ fontSize: '12px' }}>
          {listing.city}, {listing.state}
        </p>
        <div className="flex items-center gap-3">
          {[`${listing.bedrooms} bd`, `${listing.bathrooms} ba`].map((spec) => (
            <span key={spec} className="text-muted font-sans" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
              {spec}
            </span>
          ))}
          <span className="text-muted/60 font-sans" style={{ fontSize: '11px' }}>
            {listing.sqft.toLocaleString()} sqft
          </span>
        </div>
      </div>
    </article>
  )
}
