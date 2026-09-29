import React from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Star, Award, Home, Bed, Bath, Square, ChevronLeft } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'

interface AgentListing {
  id: string
  slug: string
  addressLine1: string
  city: string
  state: string
  price: number
  bedrooms: number
  bathrooms: number
  sqft: number
  propertyType: string
  status: string
  primaryImageUrl: string | null
}

interface AgentProfile {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  avatarUrl: string | null
  email: string
  agencyName: string
  licenseNumber: string | null
  bio: string | null
  specializations: string[]
  serviceAreaZips: string[]
  activeListings: number
  closedDeals: number
  listings: AgentListing[]
}

async function getAgent(id: string): Promise<AgentProfile | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${apiUrl}/agents/${id}`, { next: { revalidate: 60 } })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`API error ${res.status}`)
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const agent = await getAgent(id)
  if (!agent) return {}
  const name = `${agent.firstName} ${agent.lastName}`
  return {
    title: `${name} — ${agent.agencyName} | PropNest`,
    description: agent.bio?.slice(0, 155) ?? `Work with ${name}, ${agent.agencyName}`,
  }
}

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agent = await getAgent(id)
  if (!agent) notFound()

  const fullName = `${agent.firstName} ${agent.lastName}`
  const initials = `${agent.firstName[0]}${agent.lastName[0]}`

  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      <Navbar />

      {/* ── Back ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <Link
            href="/agents"
            className="flex items-center gap-1.5 text-sm text-muted hover:text-navy transition-colors w-fit"
          >
            <ChevronLeft size={15} /> Back to agents
          </Link>
        </div>
      </div>

      {/* ── Hero / Profile header ──────────────────────────────────────────── */}
      <section className="relative">
        {/* Banner */}
        <div className="relative h-48 sm:h-64 bg-gradient-to-br from-navy to-[#2C5F8A] overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1600&h=400&q=70"
            alt="Bay Area"
            fill
            className="object-cover opacity-40"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
        </div>

        {/* Profile card overlaying banner */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative -mt-16 sm:-mt-20 bg-white rounded-modal shadow-modal border border-border p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-navy border-4 border-white shadow-floating shrink-0">
              {agent.avatarUrl ? (
                <Image
                  src={agent.avatarUrl}
                  alt={fullName}
                  width={128}
                  height={128}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-white text-3xl font-display font-bold">{initials}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-display-sm font-bold text-[#1A1A1A]">{fullName}</h1>
                  <p className="text-muted text-sm mt-0.5">{agent.agencyName}</p>
                  {agent.licenseNumber && (
                    <p className="text-xs text-muted mt-1">License #{agent.licenseNumber}</p>
                  )}
                </div>
                {/* Rating placeholder */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Star size={16} className="text-gold fill-gold" />
                  <span className="font-semibold text-[#1A1A1A]">4.9</span>
                  <span className="text-muted text-sm">(47 reviews)</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-6 mt-4">
                <div className="text-center">
                  <p className="font-display font-bold text-navy text-xl">{agent.activeListings}</p>
                  <p className="text-[10px] text-muted uppercase tracking-wider">Active Listings</p>
                </div>
                <div className="w-px bg-border" />
                <div className="text-center">
                  <p className="font-display font-bold text-navy text-xl">{agent.closedDeals}</p>
                  <p className="text-[10px] text-muted uppercase tracking-wider">Closed Deals</p>
                </div>
                <div className="w-px bg-border" />
                <div className="text-center">
                  <p className="font-display font-bold text-navy text-xl">{agent.specializations.length}</p>
                  <p className="text-[10px] text-muted uppercase tracking-wider">Specializations</p>
                </div>
              </div>
            </div>

            {/* Contact CTA */}
            <div className="flex flex-col gap-2 sm:items-end shrink-0 w-full sm:w-auto">
              {agent.phone && (
                <Button variant="primary" size="sm" asChild>
                  <a href={`tel:${agent.phone}`} className="gap-1.5">
                    <Phone size={14} /> {agent.phone}
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${agent.email}`}>Email Agent</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">

        {/* Left — Bio + listings */}
        <div>
          {/* Bio */}
          <section className="mb-8">
            <h2 className="font-sans font-semibold text-heading-lg text-[#1A1A1A] mb-3">About</h2>
            <p className="text-[#1A1A1A] leading-relaxed text-[15px]">
              {agent.bio ?? `${fullName} is a licensed real estate agent at ${agent.agencyName}.`}
            </p>
          </section>

          {/* Specializations */}
          <section className="mb-8">
            <h2 className="font-sans font-semibold text-heading-lg text-[#1A1A1A] mb-3">Specializations</h2>
            <div className="flex flex-wrap gap-2">
              {agent.specializations.map((s) => (
                <span key={s} className="px-3 py-1 rounded-pill bg-navy/8 text-navy text-sm font-medium border border-navy/20">
                  {s}
                </span>
              ))}
            </div>
          </section>

          {/* Active listings */}
          <section>
            <h2 className="font-sans font-semibold text-heading-lg text-[#1A1A1A] mb-4">
              Active Listings
            </h2>
            {agent.listings.length === 0 ? (
              <div className="bg-white rounded-card border border-border p-8 text-center">
                <Home size={32} className="text-muted mx-auto mb-2" />
                <p className="text-muted text-sm">No active listings at this time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {agent.listings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/listings/${listing.slug}`}
                    className="group bg-white rounded-card shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] bg-navy/10 overflow-hidden">
                      {listing.primaryImageUrl ? (
                        <Image
                          src={listing.primaryImageUrl}
                          alt={listing.addressLine1}
                          fill
                          className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, 50vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home size={32} className="text-muted/40" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <StatusBadge status={listing.status} />
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-4">
                      <p className="font-display font-bold text-navy text-lg">
                        ${listing.price.toLocaleString()}
                      </p>
                      <p className="text-sm text-[#1A1A1A] font-medium truncate">{listing.addressLine1}</p>
                      <p className="text-xs text-muted mb-3">{listing.city}, {listing.state}</p>
                      <div className="flex items-center gap-4 text-xs text-muted">
                        <span className="flex items-center gap-1"><Bed size={11} /> {listing.bedrooms} bd</span>
                        <span className="flex items-center gap-1"><Bath size={11} /> {listing.bathrooms} ba</span>
                        <span className="flex items-center gap-1"><Square size={11} /> {listing.sqft.toLocaleString()} sqft</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right — Sidebar */}
        <aside>
          <div className="sticky top-6 space-y-4">
            {/* Service area */}
            <div className="bg-white rounded-card shadow-card border border-border p-5">
              <h3 className="font-sans font-semibold text-sm text-[#1A1A1A] mb-3 flex items-center gap-2">
                <MapPin size={14} className="text-navy" /> Service Area
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {agent.serviceAreaZips.map((zip) => (
                  <span key={zip} className="px-2 py-0.5 rounded-pill bg-ivory text-muted text-xs border border-border">
                    {zip}
                  </span>
                ))}
              </div>
            </div>

            {/* Achievement card */}
            <div className="bg-navy text-white rounded-card p-5">
              <Award size={22} className="text-gold mb-3" />
              <p className="font-display font-bold text-lg mb-1">Top Producer</p>
              <p className="text-white/70 text-xs leading-relaxed">
                {agent.closedDeals}+ closed transactions. Consistently ranked among the top agents in the Bay Area.
              </p>
            </div>

            {/* Contact card */}
            <div className="bg-white rounded-card shadow-card border border-border p-5">
              <h3 className="font-sans font-semibold text-sm text-[#1A1A1A] mb-4">Get in Touch</h3>
              <div className="space-y-3 text-sm">
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone}`}
                    className="flex items-center gap-2.5 text-navy hover:text-navy/70 transition-colors"
                  >
                    <Phone size={14} className="shrink-0" />
                    {agent.phone}
                  </a>
                )}
                <a
                  href={`mailto:${agent.email}`}
                  className="flex items-center gap-2.5 text-navy hover:text-navy/70 transition-colors break-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  {agent.email}
                </a>
              </div>
              <Button variant="primary" size="sm" className="w-full mt-4" asChild>
                <a href={`mailto:${agent.email}`}>Send a Message</a>
              </Button>
            </div>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  )
}
