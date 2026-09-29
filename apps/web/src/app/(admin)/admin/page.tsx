'use client'

import React from 'react'
import {
  LayoutDashboard, Users, Home, Activity, RefreshCw,
  CheckCircle2, Clock, XCircle,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { useRequireRole } from '@/hooks/useRequireRole'
import { cn } from '@/lib/cn'
import { useAdminStats, useAdminQueues, useAdminUsers, useRetryQueue } from '@/lib/hooks/useAdmin'

const NAV = [
  { label: 'Overview',  href: '/admin',  icon: LayoutDashboard },
  { label: 'Users',     href: '/admin',  icon: Users },
  { label: 'Listings',  href: '/admin',  icon: Home },
  { label: 'Queues',    href: '/admin',  icon: Activity },
]

const ROLE_COLORS: Record<string, string> = {
  buyer:  'bg-navy-50 text-navy',
  seller: 'bg-[#EDE9FE] text-[#6D28D9]',
  agent:  'bg-gold-muted text-[#92400E]',
  lender: 'bg-[#DCFCE7] text-[#166534]',
  admin:  'bg-[#FEE2E2] text-error',
}

export default function AdminOverviewPage() {
  useRequireRole('admin')

  const { data: stats } = useAdminStats()
  const { data: queues = [] } = useAdminQueues()
  const { data: usersData } = useAdminUsers({ limit: 5 } as never)
  const retryQueue = useRetryQueue()

  const statCards = [
    { label: 'Total Users',         value: stats?.totalUsers ?? '—',         sub: '',               icon: Users,    color: 'text-navy' },
    { label: 'Active Listings',     value: stats?.activeListings ?? '—',     sub: `${stats?.newListingsToday ?? 0} new today`, icon: Home, color: 'text-navy' },
    { label: 'Open Mortgages',      value: stats?.openMortgages ?? '—',      sub: `${stats?.pendingDocsMortgages ?? 0} pending docs`, icon: Activity, color: 'text-warning' },
    { label: 'Closed Transactions', value: stats?.closedTransactions ?? '—', sub: 'All time',       icon: CheckCircle2, color: 'text-success' },
  ]

  const recentUsers = usersData?.data ?? []

  return (
    <DashboardLayout navItems={NAV} title="Admin Panel" subtitle="Platform overview">

      {/* ── Stats grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-card shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-label uppercase tracking-widest text-muted">{stat.label}</p>
              <stat.icon size={15} className={stat.color} />
            </div>
            <p className="font-display font-bold text-navy text-display-sm">{String(stat.value)}</p>
            {stat.sub && <p className="text-xs text-muted mt-1">{stat.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Queue Health ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-sans font-semibold text-heading-md text-[#1A1A1A]">Queue Health</h2>
            <p className="text-xs text-muted mt-0.5">BullMQ job queues</p>
          </div>
          <div className="divide-y divide-border">
            {queues.map((queue) => {
              const hasFailures = queue.failed > 0
              return (
                <div key={queue.name} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] font-mono">{queue.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {queue.active > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-info">
                          <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" />
                          {queue.active} active
                        </span>
                      )}
                      {queue.waiting > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-muted">
                          <Clock size={9} />
                          {queue.waiting} waiting
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px] text-success">
                        <CheckCircle2 size={9} />
                        {queue.completed.toLocaleString()} done
                      </span>
                    </div>
                  </div>

                  {hasFailures ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-error font-medium">
                        <XCircle size={13} />
                        {queue.failed} failed
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        loading={retryQueue.isPending && retryQueue.variables === queue.name}
                        onClick={() => retryQueue.mutate(queue.name)}
                        className="text-xs h-7 px-2.5"
                      >
                        <RefreshCw size={11} />
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <CheckCircle2 size={16} className="text-success shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Recent Users ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-sans font-semibold text-heading-md text-[#1A1A1A]">Recent Users</h2>
              <p className="text-xs text-muted mt-0.5">Newest registrations</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a href="/admin">View all</a>
            </Button>
          </div>
          <div className="divide-y divide-border">
            {recentUsers.map((user) => (
              <div key={user.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-navy-50 flex items-center justify-center shrink-0">
                  <span className="text-navy text-xs font-semibold">{user.firstName[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-muted truncate">{user.email}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className={cn('text-label px-2 py-0.5 rounded-full font-semibold capitalize', ROLE_COLORS[user.role] ?? 'bg-navy-50 text-navy')}>
                    {user.role}
                  </span>
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    user.isActive ? 'bg-success' : 'bg-border'
                  )} title={user.isActive ? 'Active' : 'Inactive'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </DashboardLayout>
  )
}
