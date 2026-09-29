import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { requireRole } from '../../shared/auth/rbac.js'
import * as service from './service.js'
import { deleteListingImage } from './repo.js'
import {
  createListingSchema, updateListingSchema, listingStatusSchema,
  listListingsSchema, imagePresignedSchema,
} from './schema.js'
import type { JwtPayload } from '../../shared/auth/jwt.plugin.js'

export const listingsRoutes = fp(async (app: FastifyInstance) => {
  // GET /listings — public
  app.get('/listings', async (req, reply) => {
    const q = listListingsSchema.parse(req.query)
    return reply.send(await service.listListings(q))
  })

  // POST /listings — agent or seller
  app.post('/listings', {
    preHandler: [app.authenticate, requireRole('agent', 'seller', 'admin')],
  }, async (req, reply) => {
    const { userId, role } = req.user as JwtPayload
    const body = createListingSchema.parse(req.body)
    const listing = await service.createListing({
      ...body,
      agentId: role === 'agent' ? userId : (req.body as any).agentId ?? userId,
      sellerId: role === 'seller' ? userId : (req.body as any).sellerId ?? userId,
    })
    return reply.status(201).send(listing)
  })

  // GET /listings/:id — public
  app.get('/listings/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    return reply.send(await service.getListingById(id))
  })

  // GET /listings/slug/:slug — public (for SSR)
  app.get('/listings/slug/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string }
    return reply.send(await service.getListingBySlug(slug))
  })

  // PATCH /listings/:id — owner or admin
  app.patch('/listings/:id', {
    preHandler: [app.authenticate, requireRole('agent', 'seller', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId, role } = req.user as JwtPayload
    const body = updateListingSchema.parse(req.body)
    return reply.send(await service.updateListing(id, body, userId, role))
  })

  // POST /listings/:id/status — agent or admin
  app.post('/listings/:id/status', {
    preHandler: [app.authenticate, requireRole('agent', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId, role } = req.user as JwtPayload
    const { action } = listingStatusSchema.parse(req.body)
    return reply.send(await service.transitionListingStatus(id, action, userId, role))
  })

  // POST /listings/:id/images/signature — get Cloudinary upload signature
  app.post('/listings/:id/images/signature', {
    preHandler: [app.authenticate, requireRole('agent', 'seller', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId, role } = req.user as JwtPayload
    return reply.send(await service.getImageUploadSignature(id, userId, role))
  })

  // POST /listings/:id/images/confirm — confirm Cloudinary upload
  app.post('/listings/:id/images/confirm', {
    preHandler: [app.authenticate, requireRole('agent', 'seller', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId, role } = req.user as JwtPayload
    const body = req.body as {
      cloudinaryPublicId: string; url: string; width: number; height: number
    }
    return reply.status(201).send(await service.confirmImageUpload(id, body, userId, role))
  })

  // DELETE /listings/:id/images/:imgId — owner or admin
  app.delete('/listings/:id/images/:imgId', {
    preHandler: [app.authenticate, requireRole('agent', 'seller', 'admin')],
  }, async (req, reply) => {
    const { id, imgId } = req.params as { id: string; imgId: string }
    await deleteListingImage(imgId, id)
    return reply.status(204).send()
  })
})
