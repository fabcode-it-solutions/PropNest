'use client'

import React from 'react'
import { LayoutDashboard, List, Calendar, Users, Bell, Settings, Clock, AlertTriangle } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { cn } from '@/lib/cn'
import { useRequireRole } from '@/hooks/useRequireRole'
import { useCRMOverview } from '@/lib/hooks/useCRM'
import type { CRMDeal } from '@/lib/hooks/useCRM'

const NAV = [
  { label: 'CRM Overview',  href: '/crm',    icon: LayoutDashboard },
  { label: 'My Listings',   href: '/crm',    icon: List },
  { label: 'Showings',      href: '/crm',    icon: Calendar },
  { label: 'Clients',       href: '/crm',    icon: Users },
  { label: 'Notifications', href: '/crm',    icon: Bell },
  { label: 'Settings',      href: '/crm',    icon: Settings },
]

// Kanban columns mirror transaction stages
const COLUMNS = [
  { id: 'offer_pending',  label: 'Offer Pending',  color: 'bg-warning/10 border-warning/20' },
  { id: 'in_escrow',      label: 'In Escrow',       color: 'bg-navy-50 border-navy-100' },
  { id: 'closing',        label: 'Closing',         color: 'bg-gold-muted border-gold/20' },
  { id: 'closed',         label: 'Closed',          color: 'bg-[#DCFCE7] border-[#BBF7D0]' },
]

export default function AgentCRMPage() {
  useRequireRole('agent', 'admin')

  const { data: crmData } = useCRMOverview()
  const deals = crmData?.deals ?? []
  const todayShowings = crmData?.todayShowings ?? []
  const needsResponse = crmData?.needsResponse ?? []

  const dealsByStage = (stageId: string) =>
    deals.filter((d) => d.stage === stageId)

  return (
    <DashboardLayout navItems={NAV} title="CRM Dashboard" subtitle="Agent">
      <div className="flex gap-6 h-full">

        {/* ── Kanban board ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="flex gap-3 overflow-x-auto pb-4 h-full">
            {COLUMNS.map((col) => {
              const colDeals = dealsByStage(col.id)
              return (
                <div
                  key={col.id}
                  className="flex flex-col w-[280px] shrink-0"
                >
                  {/* Column header */}
                  <div className={cn('flex items-center justify-between px-3 py-2.5 rounded-t-card border-t border-x', col.color)}>
                    <h3 className="text-sm font-semibold text-[#1A1A1A]">{col.label}</h3>
                    <span className="text-xs text-muted bg-white rounded-full px-2 py-0.5 border border-border">
                      {colDeals.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className={cn(
                    'flex-1 flex flex-col gap-2 p-2 rounded-b-card border border-t-0 min-h-[400px]',
                    col.color
                  )}>
                    {colDeals.map((deal) => (
                      <DealCard key={deal.id} deal={deal} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right sidebar ─────────────────────────────────────────────────── */}
        <div className="w-64 shrink-0 hidden xl:flex flex-col gap-4">

          {/* Today's showings */}
          <div className="bg-white rounded-card shadow-card p-4">
            <h3 className="text-heading-sm text-[#1A1A1A] mb-3 flex items-center gap-2">
              <Calendar size={14} className="text-navy" />
              Today's Showings
            </h3>
            {todayShowings.length === 0 ? (
              <p className="text-xs text-muted">No showings today</p>
            ) : (
              <div className="space-y-2">
                {todayShowings.map((s) => (
                  <div key={s.id} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-navy shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#1A1A1A] truncate">{s.address}</p>
                      <p className="text-[11px] text-muted">{s.time} · {s.buyerName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Needs response */}
          <div className="bg-white rounded-card shadow-card p-4">
            <h3 className="text-heading-sm text-[#1A1A1A] mb-3 flex items-center gap-2">
              <Clock size={14} className="text-warning" />
              Needs Response
            </h3>
            {needsResponse.length === 0 ? (
              <p className="text-xs text-muted">All caught up</p>
            ) : (
              <div className="space-y-2.5">
                {needsResponse.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-card bg-[#FEF3C7] border border-[#FDE68A]">
                    <p className="text-xs font-medium text-[#92400E]">{item.type}</p>
                    <p className="text-[11px] text-[#B45309] truncate">{item.address}</p>
                    {item.amount && (
                      <p className="text-xs font-semibold text-[#92400E] mt-0.5">
                        ${(item.amount / 1_000_000).toFixed(2)}M
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}

function DealCard({ deal }: { deal: CRMDeal }) {
  const stale = deal.daysStale >= 7

  return (
    <div className={cn(
      'bg-white rounded-card shadow-card p-3 cursor-pointer',
      'hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200',
      stale && 'ring-1 ring-warning'
    )}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-medium text-sm text-[#1A1A1A] truncate">{deal.address}</p>
        {stale && <AlertTriangle size={13} className="text-warning shrink-0" />}
      </div>
      <p className="text-xs text-muted mb-2">{deal.city}</p>
      <div className="flex items-center justify-between">
        <p className="font-display font-semibold text-navy text-sm">
          ${deal.price >= 1_000_000
            ? `${(deal.price / 1_000_000).toFixed(1)}M`
            : deal.price.toLocaleString()}
        </p>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-navy-100 flex items-center justify-center">
            <span className="text-navy text-[8px] font-bold">{deal.buyerName[0]}</span>
          </div>
          <p className="text-[10px] text-muted">{deal.lastActivity}</p>
        </div>
      </div>
    </div>
  )
}
