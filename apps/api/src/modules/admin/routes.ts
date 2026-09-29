import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireRole } from '../../shared/auth/rbac.js'
import { query } from '../../config/db.js'
import {
  listingSyncQueue,
  ocrQueue,
  notificationsQueue,
  scheduledQueue,
  pdfQueue,
} from '../../shared/queues/queue-registry.js'

const QUEUES: Record<string, { queue: typeof listingSyncQueue; name: string }> = {
  'listing-sync': { queue: listingSyncQueue, name: 'listing-sync' },
  'ocr-processing': { queue: ocrQueue, name: 'ocr-processing' },
  notifications: { queue: notificationsQueue, name: 'notifications' },
  scheduled: { queue: scheduledQueue, name: 'scheduled' },
  'pdf-generation': { queue: pdfQueue, name: 'pdf-generation' },
}

export async function adminRoutes(app: FastifyInstance) {
  const adminOnly = { preHandler: [app.authenticate, requireRole('admin')] }

  // ── Users ─────────────────────────────────────────────────────────────────

  app.get('/admin/users', adminOnly, async (req, reply) => {
    const q = z.object({
      role: z.enum(['buyer', 'seller', 'agent', 'lender', 'admin']).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).parse(req.query)

    const offset = (q.page - 1) * q.limit
    const where = q.role ? `WHERE role = $3` : ''
    const params: unknown[] = q.role ? [q.limit, offset, q.role] : [q.limit, offset]

    const [rows, count] = await Promise.all([
      query(
        `SELECT id, email, role, first_name, last_name, phone, is_active, created_at
         FROM users ${where}
         ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        params
      ),
      query(
        `SELECT COUNT(*)::int AS count FROM users ${where}`,
        q.role ? [q.role] : []
      ),
    ])

    return reply.send({
      data: rows.rows,
      total: count.rows[0].count,
      page: q.page,
      limit: q.limit,
    })
  })

  app.patch('/admin/users/:id', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = z.object({
      role: z.enum(['buyer', 'seller', 'agent', 'lender', 'admin']).optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body)

    const sets: string[] = []
    const values: unknown[] = []
    let i = 1

    if (body.role !== undefined) { sets.push(`role = $${i++}`); values.push(body.role) }
    if (body.isActive !== undefined) { sets.push(`is_active = $${i++}`); values.push(body.isActive) }

    if (!sets.length) return reply.status(400).send({ message: 'Nothing to update' })

    values.push(id)
    const res = await query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING id, email, role, is_active`,
      values
    )

    if (!res.rows[0]) return reply.status(404).send({ message: 'User not found' })
    return reply.send(res.rows[0])
  })

  // ── Listings ──────────────────────────────────────────────────────────────

  app.get('/admin/listings', adminOnly, async (req, reply) => {
    const q = z.object({
      status: z.enum(['draft', 'active', 'pending', 'sold', 'withdrawn']).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).parse(req.query)

    const offset = (q.page - 1) * q.limit
    const where = q.status ? `WHERE l.status = $3` : ''
    const params: unknown[] = q.status ? [q.limit, offset, q.status] : [q.limit, offset]

    const [rows, count] = await Promise.all([
      query(
        `SELECT l.id, l.status, l.address_line1, l.city, l.state, l.price,
                l.property_type, l.created_at,
                u.first_name || ' ' || u.last_name AS agent_name
         FROM listings l
         LEFT JOIN users u ON u.id = l.agent_id
         ${where}
         ORDER BY l.created_at DESC LIMIT $1 OFFSET $2`,
        params
      ),
      query(`SELECT COUNT(*)::int AS count FROM listings ${where}`, q.status ? [q.status] : []),
    ])

    return reply.send({
      data: rows.rows,
      total: count.rows[0].count,
      page: q.page,
      limit: q.limit,
    })
  })

  app.patch('/admin/listings/:id/status', adminOnly, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status } = z.object({
      status: z.enum(['draft', 'active', 'pending', 'sold', 'withdrawn']),
    }).parse(req.body)

    const res = await query(
      `UPDATE listings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status`,
      [status, id]
    )

    if (!res.rows[0]) return reply.status(404).send({ message: 'Listing not found' })
    return reply.send(res.rows[0])
  })

  // ── Queue Health ──────────────────────────────────────────────────────────

  app.get('/admin/queues', adminOnly, async (_req, reply) => {
    const stats = await Promise.all(
      Object.entries(QUEUES).map(async ([key, { queue }]) => {
        const [active, waiting, failed, completed, delayed] = await Promise.all([
          queue.getActiveCount(),
          queue.getWaitingCount(),
          queue.getFailedCount(),
          queue.getCompletedCount(),
          queue.getDelayedCount(),
        ])
        return { name: key, active, waiting, failed, completed, delayed }
      })
    )
    return reply.send(stats)
  })

  app.post('/admin/queues/:queue/retry-failed', adminOnly, async (req, reply) => {
    const { queue: queueName } = req.params as { queue: string }
    const entry = QUEUES[queueName]
    if (!entry) return reply.status(404).send({ message: 'Queue not found' })

    const failedJobs = await entry.queue.getFailed()
    await Promise.all(failedJobs.map((job) => job.retry()))

    return reply.send({ retried: failedJobs.length })
  })

  // ── Platform Stats ────────────────────────────────────────────────────────

  app.get('/admin/stats', adminOnly, async (_req, reply) => {
    const [users, listings, mortgages, transactions] = await Promise.all([
      query<{ role: string; count: string }>(
        `SELECT role, COUNT(*)::int as count FROM users GROUP BY role`
      ),
      query<{ status: string; count: string }>(
        `SELECT status, COUNT(*)::int as count FROM listings GROUP BY status`
      ),
      query<{ stage: string; count: string }>(
        `SELECT stage, COUNT(*)::int as count FROM mortgage_applications GROUP BY stage`
      ),
      query<{ status: string; count: string }>(
        `SELECT status, COUNT(*)::int as count FROM transactions GROUP BY status`
      ),
    ])

    return reply.send({
      users: Object.fromEntries(users.rows.map((r) => [r.role, r.count])),
      listings: Object.fromEntries(listings.rows.map((r) => [r.status, r.count])),
      mortgageApplications: Object.fromEntries(mortgages.rows.map((r) => [r.stage, r.count])),
      transactions: Object.fromEntries(transactions.rows.map((r) => [r.status, r.count])),
    })
  })
}
