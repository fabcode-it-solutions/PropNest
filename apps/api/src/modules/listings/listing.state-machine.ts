import type { ListingStatus } from '@propnest/shared-types'

type Transition = {
  from: ListingStatus[]
  to: ListingStatus
  guard?: (ctx: ListingContext) => void
}

interface ListingContext {
  imageCount: number
  price: number
  hasLocation: boolean
  role: string
}

const TRANSITIONS: Record<string, Transition> = {
  publish: {
    from: ['draft'],
    to: 'active',
    guard(ctx) {
      if (ctx.imageCount < 1) throw { statusCode: 422, message: 'At least one image required to publish' }
      if (ctx.price <= 0) throw { statusCode: 422, message: 'Price must be set before publishing' }
      if (!ctx.hasLocation) throw { statusCode: 422, message: 'Location must be set before publishing' }
    },
  },
  delist: {
    from: ['active'],
    to: 'draft',
  },
  accept_offer: {
    from: ['active'],
    to: 'pending',
  },
  reopen: {
    from: ['pending'],
    to: 'active',
  },
  close: {
    from: ['pending'],
    to: 'sold',
  },
  withdraw: {
    from: ['draft', 'active', 'pending'],
    to: 'withdrawn',
    guard(ctx) {
      if (!['admin', 'agent'].includes(ctx.role)) {
        throw { statusCode: 403, message: 'Only agents or admins can withdraw listings' }
      }
    },
  },
}

export function applyListingTransition(
  currentStatus: ListingStatus,
  action: string,
  ctx: ListingContext
): ListingStatus {
  const transition = TRANSITIONS[action]
  if (!transition) throw { statusCode: 400, message: `Unknown action: ${action}` }
  if (!transition.from.includes(currentStatus)) {
    throw { statusCode: 422, message: `Cannot ${action} a listing that is ${currentStatus}` }
  }
  transition.guard?.(ctx)
  return transition.to
}
