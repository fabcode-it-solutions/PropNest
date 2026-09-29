'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // In production: Sentry.captureException(error)
    console.error('[error boundary]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-5 py-20">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-[#DC2626]/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={28} className="text-[#DC2626]" />
        </div>

        <h1 className="font-display font-bold text-navy mb-3" style={{ fontSize: '1.75rem' }}>
          Something went wrong
        </h1>
        <p className="text-muted text-base leading-relaxed mb-2">
          An unexpected error occurred. Our team has been notified.
        </p>
        {error.digest && (
          <p className="text-xs text-muted/60 font-mono mb-8">
            Error ID: {error.digest}
          </p>
        )}
        {!error.digest && <div className="mb-8" />}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="primary" size="lg" onClick={reset}>
            <RefreshCw size={16} className="mr-2" />
            Try again
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/">
              <Home size={16} className="mr-2" />
              Go home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
