import { z } from 'zod'

export const createListingSchema = z.object({
  propertyType: z.enum(['single_family', 'condo', 'townhouse', 'multi_family', 'land', 'commercial']),
  addressLine1: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().min(5),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  price: z.number().positive(),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().min(0),
  sqft: z.number().int().positive(),
  yearBuilt: z.number().int().optional(),
  description: z.string().optional(),
  features: z.record(z.unknown()).optional(),
  hoaMonthly: z.number().optional(),
})

export const updateListingSchema = createListingSchema.partial()

export const listingStatusSchema = z.object({
  action: z.enum(['publish', 'delist', 'accept_offer', 'reopen', 'close', 'withdraw']),
})

export const listListingsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['draft', 'active', 'pending', 'sold', 'withdrawn']).optional(),
  agentId: z.string().uuid().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
})

export const imagePresignedSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
})

export type CreateListingInput = z.infer<typeof createListingSchema>
export type UpdateListingInput = z.infer<typeof updateListingSchema>
