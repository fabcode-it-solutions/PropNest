'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
}

interface DashboardLayoutProps {
  children: React.ReactNode
  navItems: NavItem[]
  title: string
  subtitle?: string
}

export function DashboardLayout({
  children,
  navItems,
  title,
  subtitle,
}: DashboardLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-ivory-dark flex">

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-border">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-border">
          <Link href="/" className="font-display font-bold text-[1.125rem] text-navy tracking-tight">
            PropNest
          </Link>
          {subtitle && (
            <p className="text-xs text-muted mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-card text-sm font-medium transition-colors duration-200',
                  active
                    ? 'bg-navy-50 text-navy'
                    : 'text-muted hover:text-[#1A1A1A] hover:bg-ivory-dark'
                )}
              >
                <item.icon size={16} className={active ? 'text-navy' : 'text-muted'} />
                <span className="flex-1">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="bg-gold text-navy text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-border">
          <Link
            href="/profile"
            className="flex items-center gap-2.5 text-sm text-muted hover:text-[#1A1A1A] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-navy-100 flex items-center justify-center">
              <span className="text-navy text-xs font-semibold">U</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[#1A1A1A] font-medium text-xs truncate">My Profile</p>
              <p className="text-muted text-[10px]">Settings</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-border px-6 py-4 shrink-0">
          <h1 className="font-sans font-semibold text-heading-xl text-[#1A1A1A]">{title}</h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
