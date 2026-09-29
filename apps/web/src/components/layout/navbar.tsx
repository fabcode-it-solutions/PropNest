'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronDown, User, LogOut, LayoutDashboard } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/stores/auth'
import { NotificationBell } from '@/components/notifications/notification-bell'

const NAV_LINKS = [
  { label: 'Buy',      href: '/search' },
  { label: 'Agents',   href: '/agents' },
  { label: 'Mortgage', href: '/dashboard/mortgage' },
]

export function Navbar() {
  const pathname = usePathname()
  const { user, clearAuth } = useAuthStore()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Shadow appears after first scroll
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const isHero = pathname === '/'

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-40 h-16',
          'bg-white/95 backdrop-blur-sm',
          'transition-shadow duration-200',
          scrolled ? 'shadow-nav' : 'border-b border-border/60'
        )}
      >
        <div className="max-w-8xl mx-auto px-5 md:px-8 h-full flex items-center justify-between gap-6">

          {/* Wordmark */}
          <Link
            href="/"
            className="font-display font-bold text-[1.375rem] text-navy tracking-tight shrink-0 hover:opacity-80 transition-opacity"
          >
            PropNest
          </Link>

          {/* Center nav — desktop */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-pill transition-colors duration-200',
                  pathname.startsWith(link.href)
                    ? 'text-navy bg-navy-50'
                    : 'text-muted hover:text-[#1A1A1A] hover:bg-ivory-dark'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                {/* Notification bell */}
                <NotificationBell />

                {/* User menu */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className={cn(
                      'flex items-center gap-2 pl-1 pr-3 py-1 rounded-pill',
                      'border border-border hover:border-navy/30',
                      'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-navy/20'
                    )}>
                      <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-[#1A1A1A] max-w-[96px] truncate">
                        {user.firstName}
                      </span>
                      <ChevronDown size={14} className="text-muted" />
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={8}
                      className={cn(
                        'w-52 bg-white rounded-card shadow-floating border border-border',
                        'p-1 z-50',
                        'data-[state=open]:animate-fade-in'
                      )}
                    >
                      <div className="px-3 py-2 border-b border-border mb-1">
                        <p className="text-sm font-medium text-[#1A1A1A] truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted capitalize">{user.role}</p>
                      </div>

                      <DropdownMenu.Item asChild>
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#1A1A1A] rounded hover:bg-ivory-dark cursor-pointer focus:outline-none focus:bg-ivory-dark"
                        >
                          <LayoutDashboard size={15} className="text-muted" />
                          Dashboard
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href="/profile"
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#1A1A1A] rounded hover:bg-ivory-dark cursor-pointer focus:outline-none focus:bg-ivory-dark"
                        >
                          <User size={15} className="text-muted" />
                          Profile
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Separator className="my-1 border-t border-border" />

                      <DropdownMenu.Item
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-error rounded hover:bg-[#FEE2E2] cursor-pointer focus:outline-none focus:bg-[#FEE2E2]"
                        onSelect={() => clearAuth()}
                      >
                        <LogOut size={15} />
                        Sign out
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </>
            ) : (
              <>
                <Button variant="ghost" size="md" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button variant="primary" size="md" asChild>
                  <Link href="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-muted hover:text-navy transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 pt-16 bg-white md:hidden">
          <nav className="flex flex-col px-5 pt-4 pb-8 gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'px-4 py-3 text-base font-medium rounded-card transition-colors',
                  pathname.startsWith(link.href)
                    ? 'bg-navy-50 text-navy'
                    : 'text-[#1A1A1A] hover:bg-ivory-dark'
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
              {user ? (
                <Button variant="outline" size="lg" asChild className="w-full">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="lg" asChild className="w-full">
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button variant="primary" size="lg" asChild className="w-full">
                    <Link href="/register">Get started</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Spacer */}
      <div className="h-16" />
    </>
  )
}
