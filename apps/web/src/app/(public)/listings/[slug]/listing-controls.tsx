'use client'

import { useState } from 'react'
import { Heart, Share2, Check } from 'lucide-react'

export function ListingControls({ title, slug }: { title: string; slug: string }) {
  const url = typeof window !== 'undefined' ? window.location.href : `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/listings/${slug}`
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSave = () => setSaved((v) => !v)

  const handleShare = async () => {
    const shareData = { title, url }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // user cancelled or not supported — fall through to clipboard
      }
    }
    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSave}
        aria-label={saved ? 'Remove from saved' : 'Save listing'}
        className="p-2 rounded-full hover:bg-ivory-dark transition-colors"
      >
        <Heart
          size={18}
          strokeWidth={1.5}
          className={saved ? 'fill-gold text-gold' : 'text-muted hover:text-navy'}
        />
      </button>
      <button
        onClick={handleShare}
        aria-label="Share listing"
        className="p-2 rounded-full hover:bg-ivory-dark transition-colors"
      >
        {copied ? (
          <Check size={18} strokeWidth={1.5} className="text-green-600" />
        ) : (
          <Share2 size={18} strokeWidth={1.5} className="text-muted hover:text-navy" />
        )}
      </button>
    </div>
  )
}
