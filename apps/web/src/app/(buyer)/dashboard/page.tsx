'use client'

import React from 'react'
import Link from 'next/link'
import { Home, Bell, Heart, Calendar, DollarSign, FileText, ArrowRight } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRequireRole } from '@/hooks/useRequireRole'
import { useShowings } from '@/lib/hooks/useShowings'
import { useMyOffers } from '@/lib/hooks/useOffers'
import { useMyMortgageApplications } from '@/lib/hooks/useMortgage'

const NAV = [
  { label: 'Overview',        href: '/dashboard',          icon: Home },
  { label: 'Saved Searches',  href: '/search',             icon: Bell,     badge: 2 },
  { label: 'Saved Listings',  href: '/search',             icon: Heart },
  { label: 'Showings',        href: '/dashboard',          icon: Calendar,  badge: 1 },
  { label: 'Offers',          href: '/dashboard',          icon: DollarSign },
  { label: 'Mortgage',        href: '/dashboard/mortgage', icon: FileText },
]

const MORTGAGE_STAGES = [
  'pre_qualification',
  'document_collection',
  'document_verification',
  'underwriting_review',
  'conditional_approval',
  'final_approval',
  'closed',
]

function stageLabel(s: string) {
  return s.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

export default function BuyerDashboard() {
  useRequireRole('buyer', 'admin')

  const { data: showingsData } = useShowings({ upcoming: true })
  const { data: offersData } = useMyOffers()
  const { data: mortgageData } = useMyMortgageApplications()

  const upcomingShowings = showingsData?.data ?? []
  const recentOffers = offersData?.data ?? []
  const latestMortgage = mortgageData?.data?.[0] ?? null
  const mortgageStage = latestMortgage?.stage ?? null
  const mortgageIndex = mortgageStage ? MORTGAGE_STAGES.indexOf(mortgageStage) : -1

  // Summary card derived values
  const activeOfferCount = recentOffers.filter((o) => o.status === 'submitted' || o.status === 'countered').length
  const counteredCount = recentOffers.filter((o) => o.status === 'countered').length

  return (
    <DashboardLayout navItems={NAV} title="Dashboard" subtitle="Buyer">

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <SummaryCard
          label="Active Offers"
          value={String(activeOfferCount)}
          sub={counteredCount > 0 ? `${counteredCount} countered` : 'No new activity'}
          href="/dashboard"
          accent="gold"
        />
        <SummaryCard
          label="Upcoming Showings"
          value={String(upcomingShowings.length)}
          sub={upcomingShowings[0]
            ? `Next: ${new Date(upcomingShowings[0].scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : 'None scheduled'}
          href="/dashboard"
          accent="navy"
        />
        <SummaryCard
          label="Mortgage Stage"
          value={mortgageStage ? stageLabel(mortgageStage) : '—'}
          sub={mortgageIndex >= 0 ? `${mortgageIndex + 1} of ${MORTGAGE_STAGES.length} steps` : 'No application'}
          href="/dashboard/mortgage"
          accent="neutral"
        />
      </div>

      {/* ── Two-column layout ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Mortgage stepper */}
        <div className="bg-white rounded-card shadow-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-sans font-semibold text-heading-md text-[#1A1A1A]">Mortgage Pipeline</h2>
            <Link href="/dashboard/mortgage" className="text-sm text-navy hover:underline flex items-center gap-1">
              View details <ArrowRight size={13} />
            </Link>
          </div>

          {mortgageIndex < 0 ? (
            <EmptyState text="No mortgage application yet" action={{ label: 'Apply now', href: '/dashboard/mortgage' }} />
          ) : (
            <div className="flex items-start gap-2 overflow-x-auto pb-2">
              {MORTGAGE_STAGES.map((stage, i) => {
                const completed = i < mortgageIndex
                const current = i === mortgageIndex
                return (
                  <div key={stage} className="flex flex-col items-center gap-1.5 min-w-[72px]">
                    <div className={[
                      'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                      completed ? 'bg-navy' : current ? 'bg-white border-2 border-gold animate-pulse-ring' : 'bg-border',
                    ].join(' ')}>
                      {completed ? (
                        <svg width="12" height="10" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 12 10">
                          <polyline points="1,5 4.5,8.5 11,1" />
                        </svg>
                      ) : (
                        <span className={['text-xs font-bold', current ? 'text-gold' : 'text-white/60'].join(' ')}>
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <p className={['text-[9px] text-center leading-tight font-medium', current ? 'text-navy' : 'text-muted'].join(' ')}>
                      {stageLabel(stage)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Upcoming showings */}
        <div className="bg-white rounded-card shadow-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-sans font-semibold text-heading-md text-[#1A1A1A]">Upcoming Showings</h2>
            <Link href="/dashboard" className="text-sm text-navy hover:underline flex items-center gap-1">
              All showings <ArrowRight size={13} />
            </Link>
          </div>

          {upcomingShowings.length === 0 ? (
            <EmptyState text="No upcoming showings" action={{ label: 'Browse listings', href: '/search' }} />
          ) : (
            <div className="space-y-3">
              {upcomingShowings.map((s) => (
                <div key={s.id} className="flex items-start gap-3 p-3 rounded-card bg-ivory-dark">
                  <div className="w-10 h-10 rounded-card bg-navy-50 flex items-center justify-center shrink-0">
                    <Calendar size={16} className="text-navy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#1A1A1A] truncate">{s.listing_id}</p>
                    <p className="text-xs text-navy mt-1">
                      {new Date(s.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' · '}{new Date(s.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <StatusBadge status={s.status} className="shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent offers */}
        <div className="bg-white rounded-card shadow-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-sans font-semibold text-heading-md text-[#1A1A1A]">My Offers</h2>
            <Link href="/dashboard" className="text-sm text-navy hover:underline flex items-center gap-1">
              All offers <ArrowRight size={13} />
            </Link>
          </div>

          {recentOffers.length === 0 ? (
            <EmptyState text="No offers submitted yet" action={{ label: 'Browse listings', href: '/search' }} />
          ) : (
            <div className="divide-y divide-border">
              {recentOffers.map((offer) => (
                <div key={offer.id} className="flex items-center gap-4 py-4">
                  <div className="w-8 h-8 rounded-full bg-navy-50 flex items-center justify-center shrink-0">
                    <Home size={14} className="text-navy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#1A1A1A] truncate">Listing {offer.listing_id}</p>
                    <p className="text-xs text-muted">{new Date(offer.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-semibold text-navy">
                      ${(offer.price / 1_000_000).toFixed(2)}M
                    </p>
                    <StatusBadge status={offer.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  href,
  accent,
}: {
  label: string
  value: string
  sub: string
  href: string
  accent: 'gold' | 'navy' | 'neutral'
}) {
  const accentBar = {
    gold: 'bg-gold',
    navy: 'bg-navy',
    neutral: 'bg-border',
  }[accent]

  return (
    <Link
      href={href}
      className="block bg-white rounded-card shadow-card overflow-hidden hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className={`h-0.5 ${accentBar}`} />
      <div className="p-5">
        <p className="text-label uppercase tracking-widest text-muted mb-2">{label}</p>
        <p className="font-display font-semibold text-navy text-display-sm">{value}</p>
        <p className="text-xs text-muted mt-1">{sub}</p>
      </div>
    </Link>
  )
}

function EmptyState({ text, action }: { text: string; action?: { label: string; href: string } }) {
  return (
    <div className="text-center py-8">
      <p className="text-muted text-sm">{text}</p>
      {action && (
        <Button variant="outline" size="md" asChild className="mt-3">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  )
}
