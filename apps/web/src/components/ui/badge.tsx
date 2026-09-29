import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const badgeVariants = cva(
  'inline-flex items-center font-sans font-semibold rounded-pill whitespace-nowrap',
  {
    variants: {
      variant: {
        // Listing status — used on listing cards and detail pages
        active:    'bg-navy text-white text-label px-2.5 py-1',
        pending:   'bg-warning text-white text-label px-2.5 py-1',
        sold:      'bg-[#9CA3AF] text-white text-label px-2.5 py-1',
        draft:     'bg-ivory-dark border border-border text-muted text-label px-2.5 py-1',
        withdrawn: 'bg-[#E5E7EB] text-[#9CA3AF] text-label px-2.5 py-1',
        // Mortgage stages
        approved:  'bg-success text-white text-label px-2.5 py-1',
        denied:    'bg-error text-white text-label px-2.5 py-1',
        // OCR confidence
        high:      'bg-[#DCFCE7] text-success text-label px-2 py-0.5',
        medium:    'bg-[#FEF3C7] text-warning text-label px-2 py-0.5',
        low:       'bg-[#FEE2E2] text-error text-label px-2 py-0.5',
        // Generic
        default:   'bg-navy-50 text-navy text-label px-2.5 py-1',
        outline:   'border border-border text-muted text-label px-2.5 py-1',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

// Convenience wrapper for listing status
const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  pending: 'Pending',
  sold: 'Sold',
  draft: 'Draft',
  withdrawn: 'Withdrawn',
}

export function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  return (
    <Badge
      variant={status as any}
      className={className}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  )
}
