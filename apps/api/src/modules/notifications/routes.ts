import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from './repo.js'

export async function notificationRoutes(app: FastifyInstance) {
  // GET /notifications
  app.get(
    '/notifications',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const query = z.object({
        unreadOnly: z.coerce.boolean().optional().default(false),
        limit: z.coerce.number().int().min(1).max(100).optional().default(20),
        page: z.coerce.number().int().min(1).optional().default(1),
      }).parse(req.query)

      const offset = (query.page - 1) * query.limit
      const { notifications, total } = await getUserNotifications(
        req.user.userId,
        query.unreadOnly,
        query.limit,
        offset
      )

      return reply.send({
        data: notifications,
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      })
    }
  )

  // PATCH /notifications/:id/read
  app.patch(
    '/notifications/:id/read',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string }
      await markNotificationRead(id, req.user.userId)
      return reply.send({ success: true })
    }
  )

  // POST /notifications/read-all
  app.post(
    '/notifications/read-all',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      await markAllNotificationsRead(req.user.userId)
      return reply.send({ success: true })
    }
  )
}
