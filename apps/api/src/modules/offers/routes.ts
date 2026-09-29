import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireRole } from '../../shared/auth/rbac.js'
import * as repo from './repo.js'
import { emitter } from '../../shared/events/emitter.js'
import { redis } from '../../config/redis.js'
import type { JwtPayload } from '../../shared/auth/jwt.plugin.js'

const offerSchema = z.object({
  price: z.number().positive(),
  financingContingency: z.boolean().default(true),
  inspectionContingency: z.boolean().default(true),
  appraisalContingency: z.boolean().default(true),
  closingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  earnestMoney: z.number().min(0),
  message: z.string().optional(),
  expiryAt: z.string().datetime().optional(),
  agentId: z.string().uuid().optional(),
})

async function idempotencyCheck(userId: string, key: string) {
  const redisKey = `idempotency:${userId}:${key}`
  const cached = await redis.get(redisKey)
  return { cached, redisKey }
}

export const offersRoutes = fp(async (app: FastifyInstance) => {
  // POST /listings/:id/offers — buyer or agent
  app.post('/listings/:id/offers', {
    preHandler: [app.authenticate, requireRole('buyer', 'agent', 'admin')],
  }, async (req, reply) => {
    const { id: listingId } = req.params as { id: string }
    const { userId } = req.user as JwtPayload
    const idempotencyKey = (req.headers['idempotency-key'] as string) ?? crypto.randomUUID()

    // Idempotency check
    const { cached, redisKey } = await idempotencyCheck(userId, idempotencyKey)
    if (cached) return reply.send(JSON.parse(cached))

    const body = offerSchema.parse(req.body)
    const offer = await repo.createOffer({
      listingId, buyerId: userId, ...body, idempotencyKey,
    })

    await redis.setex(redisKey, 86400, JSON.stringify(offer))

    emitter.emit('offer.received', {
      offerId: offer.id, listingId, buyerId: userId,
      agentId: body.agentId ?? userId, price: body.price,
    })

    return reply.status(201).send(offer)
  })

  // GET /listings/:id/offers
  app.get('/listings/:id/offers', {
    preHandler: [app.authenticate, requireRole('seller', 'agent', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    return reply.send(await repo.getOffersForListing(id))
  })

  // GET /offers — buyer's own offers
  app.get('/offers', {
    preHandler: [app.authenticate, requireRole('buyer', 'agent', 'admin')],
  }, async (req, reply) => {
    const { userId } = req.user as JwtPayload
    return reply.send(await repo.getBuyerOffers(userId))
  })

  // GET /offers/:id — with full chain
  app.get('/offers/:id', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const offer = await repo.findOfferById(id)
    if (!offer) return reply.status(404).send({ message: 'Not found' })
    const chain = await repo.getOfferChain(offer.parent_offer_id ?? id)
    return reply.send({ offer, chain })
  })

  // POST /offers/:id/counter — seller or agent
  app.post('/offers/:id/counter', {
    preHandler: [app.authenticate, requireRole('seller', 'agent', 'admin')],
  }, async (req, reply) => {
    const { id: parentOfferId } = req.params as { id: string }
    const { userId } = req.user as JwtPayload
    // closingDate and earnestMoney are optional — inherited from parent when not provided
    const counterSchema = offerSchema.extend({
      closingDate: offerSchema.shape.closingDate.optional(),
      earnestMoney: offerSchema.shape.earnestMoney.optional(),
    })
    const body = counterSchema.parse(req.body)
    const parent = await repo.findOfferById(parentOfferId)
    if (!parent) return reply.status(404).send({ message: 'Offer not found' })

    await repo.updateOfferStatus(parentOfferId, 'countered')
    const idempotencyKey = crypto.randomUUID()
    const counter = await repo.createOffer({
      listingId: parent.listing_id,
      buyerId: parent.buyer_id,
      parentOfferId,
      ...body,
      closingDate: body.closingDate ?? parent.closing_date,
      earnestMoney: body.earnestMoney ?? Number(parent.earnest_money),
      idempotencyKey,
    })

    emitter.emit('offer.countered', {
      offerId: counter.id, parentOfferId, listingId: parent.listing_id,
      buyerId: parent.buyer_id, price: body.price,
    })

    return reply.status(201).send(counter)
  })

  // POST /offers/:id/accept — seller or agent
  app.post('/offers/:id/accept', {
    preHandler: [app.authenticate, requireRole('seller', 'agent', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const offer = await repo.findOfferById(id)
    if (!offer) return reply.status(404).send({ message: 'Offer not found' })

    // Create transaction
    const { query } = await import('../../config/db.js')
    const { rows } = await query(
      `INSERT INTO transactions (listing_id, offer_id, buyer_id, seller_id, agent_id, sale_price, closing_date)
       SELECT $1, $2, buyer_id, $3, $4, price, closing_date FROM offers WHERE id = $2
       RETURNING *`,
      [offer.listing_id, id, (req.user as JwtPayload).userId, (req.user as JwtPayload).userId]
    )
    const transaction = rows[0]

    await Promise.all([
      repo.updateOfferStatus(id, 'accepted'),
      repo.rejectOtherOffers(offer.listing_id, id),
      // listing → pending
      query(`UPDATE listings SET status = 'pending', pending_at = now() WHERE id = $1`, [offer.listing_id]),
    ])

    emitter.emit('offer.accepted', {
      offerId: id, listingId: offer.listing_id,
      buyerId: offer.buyer_id, transactionId: transaction.id,
    })

    return reply.send({ offer: await repo.findOfferById(id), transaction })
  })

  // POST /offers/:id/reject
  app.post('/offers/:id/reject', {
    preHandler: [app.authenticate, requireRole('seller', 'agent', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const offer = await repo.findOfferById(id)
    if (!offer) return reply.status(404).send({ message: 'Offer not found' })
    await repo.updateOfferStatus(id, 'rejected')
    emitter.emit('offer.rejected', { offerId: id, listingId: offer.listing_id, buyerId: offer.buyer_id })
    return reply.send({ success: true })
  })

  // POST /offers/:id/withdraw — buyer
  app.post('/offers/:id/withdraw', {
    preHandler: [app.authenticate, requireRole('buyer', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId } = req.user as JwtPayload
    const offer = await repo.findOfferById(id)
    if (!offer) return reply.status(404).send({ message: 'Offer not found' })
    if (offer.buyer_id !== userId) return reply.status(403).send({ message: 'Not your offer' })
    await repo.updateOfferStatus(id, 'withdrawn')
    return reply.send({ success: true })
  })
})
