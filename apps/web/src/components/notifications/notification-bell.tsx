'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Bell, X, CheckCheck, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { useSocket } from '@/hooks/useSocket'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/stores/auth'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read_at: string | null
  created_at: string
  action_url: string | null
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function NotificationBell() {
  const { user } = useAuthStore()
  const socket = useSocket()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read_at).length

  // Fetch on open
  useEffect(() => {
    if (!open || !user) return
    setLoading(true)
    api.get<{ data: Notification[] }>('/notifications?limit=15')
      .then((res) => setNotifications(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, user])

  // Real-time incoming notifications
  useEffect(() => {
    if (!socket) return

    function onNotification(n: Notification) {
      setNotifications((prev) => [n, ...prev.slice(0, 14)])
    }

    socket.on('notification', onNotification)
    return () => { socket.off('notification', onNotification) }
  }, [socket])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function markRead(id: string) {
    api.patch(`/notifications/${id}/read`).catch(() => {})
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
    )
  }

  function markAllRead() {
    api.post('/notifications/read-all').catch(() => {})
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    )
  }

  if (!user) return null

  return (
    <div ref={panelRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-muted hover:text-[#1A1A1A] transition-colors rounded-card hover:bg-ivory-dark"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-gold text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-modal shadow-modal border border-border z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm text-[#1A1A1A]">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-muted hover:text-navy transition-colors px-2 py-1 rounded"
                >
                  <CheckCheck size={13} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-muted hover:text-[#1A1A1A] transition-colors rounded"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="py-8 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-navy border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="text-muted mx-auto mb-2" />
                <p className="text-sm text-muted">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex gap-3 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-ivory-dark transition-colors cursor-pointer',
                    !n.read_at && 'bg-navy/[0.03]'
                  )}
                  onClick={() => markRead(n.id)}
                >
                  {/* Unread dot */}
                  <div className="pt-1.5 shrink-0">
                    <div className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      n.read_at ? 'bg-transparent' : 'bg-gold'
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm leading-snug',
                      n.read_at ? 'text-muted font-normal' : 'text-[#1A1A1A] font-medium'
                    )}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-muted mt-0.5 leading-snug line-clamp-2">
                        {n.body}
                      </p>
                    )}
                    <p className="text-[10px] text-muted/70 mt-1">{timeAgo(n.created_at)}</p>
                  </div>

                  {n.action_url && (
                    <Link
                      href={n.action_url}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 pt-1 text-muted hover:text-navy transition-colors"
                    >
                      <ExternalLink size={13} />
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
