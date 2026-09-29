import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireRole } from '../../shared/auth/rbac.js'
import * as repo from './repo.js'
import { emitter } from '../../shared/events/emitter.js'
import { notificationsQueue, scheduledQueue } from '../../shared/queues/queue-registry.js'
import type { JwtPayload } from '../../shared/auth/jwt.plugin.js'

const createShowingSchema = z.object({
  agentId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().positive().default(30),
  notes: z.string().optional(),
})

export const showingsRoutes = fp(async (app: FastifyInstance) => {
  // POST /listings/:id/showings
  app.post('/listings/:id/showings', {
    preHandler: [app.authenticate, requireRole('buyer', 'agent', 'admin')],
  }, async (req, reply) => {
    const { id: listingId } = req.params as { id: string }
    const { userId } = req.user as JwtPayload
    const body = createShowingSchema.parse(req.body)
    const showing = await repo.createShowing({ listingId, buyerId: userId, ...body })
    emitter.emit('showing.requested', {
      showingId: showing.id, listingId, buyerId: userId,
      agentId: body.agentId, scheduledAt: body.scheduledAt,
    })
    return reply.status(201).send(showing)
  })

  // GET /listings/:id/showings — agent/seller/admin
  app.get('/listings/:id/showings', {
    preHandler: [app.authenticate, requireRole('agent', 'seller', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    return reply.send(await repo.listShowingsByListing(id))
  })

  // GET /showings — own showings
  app.get('/showings', {
    preHandler: [app.authenticate, requireRole('buyer', 'agent', 'admin')],
  }, async (req, reply) => {
    const { userId, role } = req.user as JwtPayload
    return reply.send(await repo.listShowingsByUser(userId, role))
  })

  // PATCH /showings/:id — confirm or cancel
  app.patch('/showings/:id', {
    preHandler: [app.authenticate, requireRole('agent', 'seller', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId } = req.user as JwtPayload
    const { action } = req.body as { action: 'confirm' | 'cancel' }

    if (action === 'confirm') {
      const showing = await repo.confirmShowing(id)
      emitter.emit('showing.confirmed', {
        showingId: id, listingId: showing.listing_id,
        buyerId: showing.buyer_id, agentId: showing.agent_id,
        scheduledAt: showing.scheduled_at,
      })
      // Schedule reminder jobs
      const scheduledMs = new Date(showing.scheduled_at).getTime()
      await scheduledQueue.add('showing-reminder', { showingId: id, windowHours: 24 }, {
        delay: Math.max(0, scheduledMs - 24 * 3600_000 - Date.now()),
        jobId: `showing:${id}:reminder-24h`,
      })
      await scheduledQueue.add('showing-reminder', { showingId: id, windowHours: 1 }, {
        delay: Math.max(0, scheduledMs - 3600_000 - Date.now()),
        jobId: `showing:${id}:reminder-1h`,
      })
      return reply.send(showing)
    }

    const showing = await repo.cancelShowing(id, userId)
    emitter.emit('showing.cancelled', {
      showingId: id, listingId: showing.listing_id,
      buyerId: showing.buyer_id, agentId: showing.agent_id, cancelledBy: userId,
    })
    return reply.send(showing)
  })

  // DELETE /showings/:id
  app.delete('/showings/:id', {
    preHandler: [app.authenticate, requireRole('buyer', 'agent', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await repo.cancelShowing(id, (req.user as JwtPayload).userId)
    return reply.status(204).send()
  })
})
