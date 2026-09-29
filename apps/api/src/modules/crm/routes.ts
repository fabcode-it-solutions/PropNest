import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { requireRole } from '../../shared/auth/rbac.js'
import { query } from '../../config/db.js'
import type { JwtPayload } from '../../shared/auth/jwt.plugin.js'

export const crmRoutes = fp(async (app: FastifyInstance) => {
  // GET /crm/overview — agent CRM dashboard data
  app.get('/crm/overview', {
    preHandler: [app.authenticate, requireRole('agent', 'admin')],
  }, async (req, reply) => {
    const { userId } = req.user as JwtPayload

    // Resolve agents.id from users.id
    const agentRow = await query<{ id: string }>(
      `SELECT id FROM agents WHERE user_id = $1`,
      [userId]
    )
    if (!agentRow.rows.length) return reply.code(403).send({ error: 'Not an agent' })
    const agentId = agentRow.rows[0].id

    // Deals: transactions for this agent grouped into Kanban stages
    const dealsResult = await query<{
      id: string
      listing_id: string
      address_line1: string
      city: string
      buyer_first: string
      buyer_last: string
      sale_price: string
      status: string
      updated_at: string
      created_at: string
    }>(
      `SELECT
         t.id, t.listing_id,
         l.address_line1, l.city,
         u.first_name AS buyer_first, u.last_name AS buyer_last,
         t.sale_price::text,
         t.status,
         t.updated_at, t.created_at
       FROM transactions t
       JOIN listings l ON l.id = t.listing_id
       JOIN users u ON u.id = t.buyer_id
       WHERE t.agent_id = $1 AND t.status != 'cancelled'
       ORDER BY t.updated_at DESC
       LIMIT 50`,
      [agentId]
    )

    // Pending offers on agent's listings that need a response
    const offersResult = await query<{
      id: string
      listing_id: string
      address_line1: string
      price: string
      created_at: string
    }>(
      `SELECT o.id, o.listing_id, l.address_line1, o.price::text, o.created_at
       FROM offers o
       JOIN listings l ON l.id = o.listing_id
       WHERE l.agent_id = $1 AND o.status = 'submitted'
       ORDER BY o.created_at ASC
       LIMIT 20`,
      [agentId]
    )

    // Today's confirmed showings
    const showingsResult = await query<{
      id: string
      scheduled_at: string
      listing_id: string
      address_line1: string
      buyer_first: string
      buyer_last: string
    }>(
      `SELECT
         s.id, s.scheduled_at,
         l.address_line1,
         u.first_name AS buyer_first, u.last_name AS buyer_last
       FROM showings s
       JOIN listings l ON l.id = s.listing_id
       JOIN users u ON u.id = s.buyer_id
       WHERE s.agent_id = $1
         AND s.status = 'confirmed'
         AND s.scheduled_at::date = CURRENT_DATE
       ORDER BY s.scheduled_at`,
      [agentId]
    )

    // Map transaction status → CRM stage
    function txToStage(status: string): string {
      if (status === 'opened') return 'offer_pending'
      if (status === 'in_escrow') return 'in_escrow'
      if (status === 'closing') return 'closing'
      return 'closed'
    }

    const now = Date.now()
    const deals = dealsResult.rows.map((r) => {
      const lastActivity = new Date(r.updated_at).getTime()
      const daysStale = Math.floor((now - lastActivity) / 86_400_000)
      return {
        id: r.id,
        address: r.address_line1,
        city: r.city,
        buyerName: `${r.buyer_first} ${r.buyer_last}`,
        price: Number(r.sale_price),
        stage: txToStage(r.status),
        daysStale,
        lastActivity: r.updated_at,
      }
    })

    const needsResponse = offersResult.rows.map((o) => ({
      id: o.id,
      address: o.address_line1,
      type: 'Offer received',
      amount: Number(o.price),
    }))

    const todayShowings = showingsResult.rows.map((s) => ({
      id: s.id,
      time: s.scheduled_at,
      address: s.address_line1,
      buyerName: `${s.buyer_first} ${s.buyer_last}`,
    }))

    return reply.send({ deals, needsResponse, todayShowings })
  })
})
