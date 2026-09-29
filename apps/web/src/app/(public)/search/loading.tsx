import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export default function SearchLoading() {
  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* List panel */}
      <div className="w-[400px] shrink-0 border-r border-border flex flex-col">
        {/* Filters */}
        <div className="px-4 py-3 border-b border-border flex gap-2">
          <Skeleton className="h-8 w-24 rounded-pill" />
          <Skeleton className="h-8 w-20 rounded-pill" />
          <Skeleton className="h-8 w-28 rounded-pill" />
        </div>
        {/* Listings */}
        <div className="flex-1 overflow-hidden divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-4">
              <Skeleton className="w-24 h-16 rounded-card shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Map placeholder */}
      <Skeleton className="flex-1" style={{ borderRadius: 0 }} />
    </div>
  )
}
