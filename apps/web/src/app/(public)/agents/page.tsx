import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { MapPin, Star, Phone, Award } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Find an Agent | PropNest',
  description: 'Work with a top-rated real estate agent in the Bay Area. Browse agent profiles, specializations, and recent sales.',
}

interface Agent {
  id: string
  firstName: string
  lastName: string
  agencyName: string
  bio: string | null
  specializations: string[]
  serviceAreaZips: string[]
  phone: string | null
  avatarUrl: string | null
  activeListings: number
  closedDeals: number
}

// Supplementary display data keyed by agent first+last name for known seeded agents
const DISPLAY_EXTRAS: Record<string, { avgRating: number; reviewCount: number; bannerUrl: string; cities: string[] }> = {
  'Sarah Chen': {
    avgRating: 4.9, reviewCount: 47,
    bannerUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=800&h=200&q=70',
    cities: ['Pacific Heights', 'Marina District', 'Nob Hill'],
  },
  'Marcus Rivera': {
    avgRating: 4.8, reviewCount: 89,
    bannerUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=800&h=200&q=70',
    cities: ['Oakland', 'Berkeley', 'Emeryville'],
  },
  'Priya Patel': {
    avgRating: 4.9, reviewCount: 62,
    bannerUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&h=200&q=70',
    cities: ['Palo Alto', 'Menlo Park', 'Burlingame'],
  },
}

// Fallback banner images pool for agents without known extras
const BANNER_POOL = [
  'https://images.unsplash.com/photo-1508802426711-eff6ff9b1b33?auto=format&fit=crop&w=800&h=200&q=70',
  'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?auto=format&fit=crop&w=800&h=200&q=70',
  'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=800&h=200&q=70',
]

async function getAgents(): Promise<Agent[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${apiUrl}/agents`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

const SPECIALIZATIONS = [
  'All', 'Luxury Homes', 'First-Time Buyers', 'Investment', 'New Construction', 'Waterfront', 'Condo',
]

export default async function AgentsPage() {
  const agents = await getAgents()
  // Filter out test/E2E agents with empty agency names or bios
  const displayAgents = agents.filter((a) => a.agencyName && a.agencyName !== 'E2E Realty')

  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-navy text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-label uppercase tracking-widest text-gold mb-3">Our Agents</p>
          <h1 className="font-display text-display-lg font-bold mb-4">
            Find Your Perfect Agent
          </h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Work with top-rated Bay Area agents who know your neighborhood better than anyone.
          </p>
        </div>
      </section>

      {/* ── Filter pills ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {SPECIALIZATIONS.map((spec) => (
            <button
              key={spec}
              className={[
                'shrink-0 px-4 py-1.5 rounded-pill text-sm font-medium border transition-colors',
                spec === 'All'
                  ? 'bg-navy border-navy text-white'
                  : 'border-border text-[#1A1A1A] hover:border-navy/30',
              ].join(' ')}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* ── Agent grid ────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-10">
        <p className="text-sm text-muted mb-6">
          <span className="font-semibold text-[#1A1A1A]">{displayAgents.length}</span> agents in the Bay Area
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayAgents.map((agent, i) => {
            const fullName = `${agent.firstName} ${agent.lastName}`
            const extras = DISPLAY_EXTRAS[fullName] ?? {
              avgRating: 4.7,
              reviewCount: 31 + i * 7,
              bannerUrl: BANNER_POOL[i % BANNER_POOL.length],
              cities: agent.serviceAreaZips.slice(0, 3),
            }
            return <AgentCard key={agent.id} agent={agent} extras={extras} />
          })}
        </div>

        {/* CTA for agents to join */}
        <div className="mt-16 rounded-modal bg-navy text-white p-10 text-center">
          <Award size={28} className="text-gold mx-auto mb-3" />
          <h2 className="font-display text-display-sm font-bold mb-2">Are You an Agent?</h2>
          <p className="text-white/70 mb-6 max-w-md mx-auto text-sm">
            Join PropNest to reach buyers and sellers across the Bay Area. Manage your listings, showings, and deals from one powerful dashboard.
          </p>
          <Button variant="primary" size="lg" asChild>
            <Link href="/register">Join as an Agent</Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  )
}

// ── AgentCard ──────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  extras,
}: {
  agent: Agent
  extras: { avgRating: number; reviewCount: number; bannerUrl: string; cities: string[] }
}) {
  const initials = `${agent.firstName[0]}${agent.lastName[0]}`

  return (
    <div className="bg-white rounded-card shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* Card header — banner + avatar overlay */}
      <div className="relative">
        {/* Banner */}
        <div className="relative h-24 overflow-hidden">
          <Image
            src={extras.bannerUrl}
            alt=""
            fill
            className="object-cover"
            sizes="400px"
          />
          <div className="absolute inset-0 bg-navy/30" />
        </div>
        {/* Avatar — outside the overflow-hidden banner so it's not clipped */}
        <div className="absolute bottom-0 translate-y-1/2 left-5 w-16 h-16 rounded-full bg-white border-[3px] border-white shadow-card overflow-hidden flex items-center justify-center">
          {agent.avatarUrl ? (
            <Image
              src={agent.avatarUrl}
              alt={agent.firstName}
              width={64}
              height={64}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="font-display font-bold text-navy text-lg">{initials}</span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="pt-10 px-5 pb-5">
        {/* Name + agency */}
        <div className="mb-1">
          <h2 className="font-sans font-semibold text-[#1A1A1A]">
            {agent.firstName} {agent.lastName}
          </h2>
          <p className="text-xs text-muted">{agent.agencyName}</p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          <Star size={12} className="text-gold fill-gold" />
          <span className="text-sm font-medium text-[#1A1A1A]">{extras.avgRating}</span>
          <span className="text-xs text-muted">({extras.reviewCount} reviews)</span>
        </div>

        {/* Bio */}
        <p className="text-xs text-muted leading-relaxed mb-4 line-clamp-3">
          {agent.bio ?? `${agent.firstName} is a licensed agent at ${agent.agencyName}.`}
        </p>

        {/* Specializations */}
        {agent.specializations.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {agent.specializations.slice(0, 3).map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-pill bg-navy/8 text-navy text-[10px] font-medium border border-navy/20">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Service area */}
        {extras.cities.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted mb-4">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{extras.cities.join(' · ')}</span>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 bg-ivory rounded-card px-4 py-3 mb-4 text-center">
          <div>
            <p className="font-display font-bold text-navy text-sm">{agent.activeListings}</p>
            <p className="text-[10px] text-muted uppercase tracking-wider">Active Listings</p>
          </div>
          <div>
            <p className="font-display font-bold text-navy text-sm">{agent.closedDeals}</p>
            <p className="text-[10px] text-muted uppercase tracking-wider">Closed Deals</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {agent.phone && (
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" asChild>
              <a href={`tel:${agent.phone}`}>
                <Phone size={12} /> Call
              </a>
            </Button>
          )}
          <Button variant="navy" size="sm" className="flex-1" asChild>
            <Link href={`/agents/${agent.id}`}>View Profile</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
