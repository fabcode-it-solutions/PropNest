'use client'

import React, { useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useToastStore, type Toast } from '@/lib/stores/toast'
import { useSocket } from '@/hooks/useSocket'

// ── Individual toast ──────────────────────────────────────────────────────────

const VARIANTS: Record<Toast['variant'], {
  icon: React.ReactNode
  bar: string
  bg: string
}> = {
  default: {
    icon: <Info size={15} className="text-navy" />,
    bar: 'bg-navy',
    bg: 'bg-white',
  },
  success: {
    icon: <CheckCircle2 size={15} className="text-[#16A34A]" />,
    bar: 'bg-[#16A34A]',
    bg: 'bg-white',
  },
  error: {
    icon: <AlertCircle size={15} className="text-[#DC2626]" />,
    bar: 'bg-[#DC2626]',
    bg: 'bg-white',
  },
  warning: {
    icon: <AlertTriangle size={15} className="text-[#D97706]" />,
    bar: 'bg-[#D97706]',
    bg: 'bg-white',
  },
}

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss)
  const config = VARIANTS[t.variant]

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 w-full max-w-sm rounded-card shadow-floating border border-border overflow-hidden',
        'animate-slide-up',
        config.bg
      )}
      role="alert"
    >
      {/* Accent bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', config.bar)} />

      <div className="flex items-start gap-3 pl-4 pr-3 py-3 flex-1 min-w-0">
        <div className="shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1A1A1A] leading-snug">{t.title}</p>
          {t.body && (
            <p className="text-xs text-muted mt-0.5 leading-snug line-clamp-2">{t.body}</p>
          )}
        </div>
        <button
          onClick={() => dismiss(t.id)}
          className="shrink-0 p-0.5 text-muted hover:text-[#1A1A1A] transition-colors rounded"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Socket listener — mounts once in Toaster, wires notifications → toasts ───

function SocketToastListener() {
  const socket = useSocket()
  const push = useToastStore((s) => s.push)

  useEffect(() => {
    if (!socket) return

    function onNotification(n: { title: string; body?: string; type?: string }) {
      push({
        title: n.title,
        body: n.body,
        variant: 'default',
        duration: 5000,
      })
    }

    socket.on('notification', onNotification)
    return () => { socket.off('notification', onNotification) }
  }, [socket, push])

  return null
}

// ── Toaster container ─────────────────────────────────────────────────────────

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <>
      <SocketToastListener />
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full max-w-sm">
            <ToastItem t={t} />
          </div>
        ))}
      </div>
    </>
  )
}
