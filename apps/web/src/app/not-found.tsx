import React from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Home, Search, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Page Not Found',
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-5 py-20">
        <div className="text-center max-w-md">
          {/* Large 404 */}
          <p
            className="font-display font-bold text-[#E4E2DD] select-none leading-none"
            style={{ fontSize: 'clamp(6rem, 20vw, 9rem)' }}
            aria-hidden="true"
          >
            404
          </p>

          <h1 className="font-display font-bold text-navy mt-2 mb-3" style={{ fontSize: '1.75rem' }}>
            Page not found
          </h1>
          <p className="text-muted text-base leading-relaxed mb-8">
            The page you&apos;re looking for has moved, been removed, or doesn&apos;t exist.
            Let&apos;s get you back on track.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="primary" size="lg" asChild>
              <Link href="/search">
                <Search size={16} className="mr-2" />
                Browse listings
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/">
                <Home size={16} className="mr-2" />
                Go home
              </Link>
            </Button>
          </div>

          <Link
            href="javascript:history.back()"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-navy transition-colors"
          >
            <ArrowLeft size={14} />
            Go back
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
