import React from 'react'
import { Skeleton, TableRowSkeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>

      {/* Mortgage stepper */}
      <Skeleton className="h-28 rounded-card" />

      {/* Two column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-card border border-border p-5 space-y-3">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRowSkeleton key={i} cols={3} />
          ))}
        </div>
        <div className="bg-white rounded-card border border-border p-5 space-y-3">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRowSkeleton key={i} cols={3} />
          ))}
        </div>
      </div>
    </div>
  )
}
