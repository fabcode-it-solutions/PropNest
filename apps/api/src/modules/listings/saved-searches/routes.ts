import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query } from '../../../config/db.js'

const savedSearchSchema = z.object({
  name: z.string().min(1).max(100),
  filters: z.record(z.unknown()),
  alertFrequency: z.enum(['immediate', 'daily_digest', 'off']).default('immediate'),
})

export async function savedSearchRoutes(app: FastifyInstance) {
  // POST /saved-searches
  app.post(
    '/saved-searches',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const body = savedSearchSchema.parse(req.body)

      const res = await query(
        `INSERT INTO saved_searches (buyer_id, name, filters, alert_frequency)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [req.user.userId, body.name, JSON.stringify(body.filters), body.alertFrequency]
      )
      return reply.status(201).send(res.rows[0])
    }
  )

  // GET /saved-searches
  app.get(
    '/saved-searches',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const res = await query(
        `SELECT * FROM saved_searches WHERE buyer_id = $1 ORDER BY created_at DESC`,
        [req.user.userId]
      )
      return reply.send(res.rows)
    }
  )

  // PATCH /saved-searches/:id
  app.patch(
    '/saved-searches/:id',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string }
      const body = savedSearchSchema.partial().parse(req.body)

      const sets: string[] = []
      const values: unknown[] = []
      let i = 1

      if (body.name !== undefined) { sets.push(`name = $${i++}`); values.push(body.name) }
      if (body.filters !== undefined) { sets.push(`filters = $${i++}`); values.push(JSON.stringify(body.filters)) }
      if (body.alertFrequency !== undefined) { sets.push(`alert_frequency = $${i++}`); values.push(body.alertFrequency) }

      if (!sets.length) return reply.send({ success: true })

      values.push(id, req.user.userId)
      const res = await query(
        `UPDATE saved_searches SET ${sets.join(', ')} WHERE id = $${i++} AND buyer_id = $${i} RETURNING *`,
        values
      )

      if (!res.rows[0]) return reply.status(404).send({ message: 'Not found' })
      return reply.send(res.rows[0])
    }
  )

  // DELETE /saved-searches/:id
  app.delete(
    '/saved-searches/:id',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string }
      await query(
        `DELETE FROM saved_searches WHERE id = $1 AND buyer_id = $2`,
        [id, req.user.userId]
      )
      return reply.status(204).send()
    }
  )
}
