import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export default function ListingDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-5 py-8 space-y-8">
      {/* Image gallery skeleton */}
      <div className="grid grid-cols-4 gap-2 h-[420px]">
        <Skeleton className="col-span-2 row-span-2 rounded-l-card h-full" />
        <Skeleton className="rounded-tr-card h-full" />
        <Skeleton className="h-full" />
        <Skeleton className="h-full" />
        <Skeleton className="rounded-br-card h-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">
        {/* Left */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
          </div>
          <div className="flex gap-6">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="space-y-2 pt-4 border-t border-border">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <Skeleton className="h-[240px] rounded-card" />
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
        </div>
      </div>
    </div>
  )
}
