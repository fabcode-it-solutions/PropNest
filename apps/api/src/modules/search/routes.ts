import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { searchListings, suggest } from './es.service.js'
import type { SearchFilters } from '@propnest/shared-types'

const searchSchema = z.object({
  filters: z.object({
    q: z.string().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    minBedrooms: z.number().optional(),
    minBathrooms: z.number().optional(),
    propertyTypes: z.array(z.string()).optional(),
    features: z.array(z.string()).optional(),
    geo: z.object({
      type: z.enum(['radius', 'bbox', 'polygon']),
      center: z.tuple([z.number(), z.number()]).optional(),
      radiusKm: z.number().optional(),
      bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
      polygon: z.array(z.tuple([z.number(), z.number()])).optional(),
    }).optional(),
  }),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
  sortBy: z.enum(['price_asc', 'price_desc', 'listed_at_desc', 'relevance']).default('listed_at_desc'),
})

export const searchRoutes = fp(async (app: FastifyInstance) => {
  // POST /search/listings
  app.post('/search/listings', async (req, reply) => {
    const { filters, page, pageSize, sortBy } = searchSchema.parse(req.body)
    return reply.send(await searchListings(filters as unknown as SearchFilters, page, pageSize, sortBy))
  })

  // GET /search/suggest?q=...
  app.get('/search/suggest', async (req, reply) => {
    const { q } = req.query as { q?: string }
    if (!q || q.length < 2) return reply.send([])
    return reply.send(await suggest(q))
  })
})
