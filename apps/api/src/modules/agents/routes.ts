import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { query } from '../../config/db.js'

export const agentsRoutes = fp(async (app: FastifyInstance) => {
  // GET /agents — public list of all agents
  app.get('/agents', async (_req, reply) => {
    const result = await query<{
      id: string
      user_id: string
      first_name: string
      last_name: string
      phone: string | null
      avatar_url: string | null
      agency_name: string
      bio: string | null
      specializations: string[]
      service_area_zips: string[]
      active_listings: string
      closed_deals: string
    }>(
      `SELECT
         a.id,
         a.user_id,
         u.first_name,
         u.last_name,
         u.phone,
         u.avatar_url,
         a.agency_name,
         a.bio,
         a.specializations,
         a.service_area_zips,
         COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') AS active_listings,
         COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'closed') AS closed_deals
       FROM agents a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN listings l ON l.agent_id = a.id
       LEFT JOIN transactions t ON t.agent_id = a.id
       WHERE u.is_active = true
       GROUP BY a.id, a.user_id, u.first_name, u.last_name, u.phone, u.avatar_url,
                a.agency_name, a.bio, a.specializations, a.service_area_zips
       ORDER BY u.first_name`,
      []
    )

    return reply.send(
      result.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        firstName: r.first_name,
        lastName: r.last_name,
        phone: r.phone,
        avatarUrl: r.avatar_url,
        agencyName: r.agency_name,
        bio: r.bio,
        specializations: r.specializations ?? [],
        serviceAreaZips: r.service_area_zips ?? [],
        activeListings: Number(r.active_listings),
        closedDeals: Number(r.closed_deals),
      }))
    )
  })

  // GET /agents/:id — agent profile + their active listings
  app.get('/agents/:id', async (req, reply) => {
    const { id } = req.params as { id: string }

    const agentResult = await query<{
      id: string
      user_id: string
      first_name: string
      last_name: string
      phone: string | null
      avatar_url: string | null
      email: string
      agency_name: string
      license_number: string | null
      bio: string | null
      specializations: string[]
      service_area_zips: string[]
      active_listings: string
      closed_deals: string
    }>(
      `SELECT
         a.id,
         a.user_id,
         u.first_name,
         u.last_name,
         u.phone,
         u.avatar_url,
         u.email,
         a.agency_name,
         a.license_number,
         a.bio,
         a.specializations,
         a.service_area_zips,
         COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'active') AS active_listings,
         COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'closed') AS closed_deals
       FROM agents a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN listings l ON l.agent_id = a.id
       LEFT JOIN transactions t ON t.agent_id = a.id
       WHERE a.id = $1 AND u.is_active = true
       GROUP BY a.id, a.user_id, u.first_name, u.last_name, u.phone, u.avatar_url, u.email,
                a.agency_name, a.license_number, a.bio, a.specializations, a.service_area_zips`,
      [id]
    )

    if (!agentResult.rows[0]) {
      return reply.status(404).send({ message: 'Agent not found' })
    }

    const agent = agentResult.rows[0]

    // Fetch their active listings with primary image
    const listingsResult = await query<{
      id: string
      slug: string
      address_line1: string
      city: string
      state: string
      zip: string
      price: string
      bedrooms: number
      bathrooms: string
      sqft: number
      property_type: string
      status: string
      primary_image_url: string | null
      listed_at: string | null
    }>(
      `SELECT
         l.id, l.slug, l.address_line1, l.city, l.state, l.zip,
         l.price::text, l.bedrooms, l.bathrooms::text, l.sqft,
         l.property_type, l.status, l.primary_image_url, l.listed_at
       FROM listings l
       WHERE l.agent_id = $1 AND l.status IN ('active', 'pending')
       ORDER BY l.listed_at DESC NULLS LAST
       LIMIT 12`,
      [id]
    )

    return reply.send({
      id: agent.id,
      userId: agent.user_id,
      firstName: agent.first_name,
      lastName: agent.last_name,
      phone: agent.phone,
      avatarUrl: agent.avatar_url,
      email: agent.email,
      agencyName: agent.agency_name,
      licenseNumber: agent.license_number,
      bio: agent.bio,
      specializations: agent.specializations ?? [],
      serviceAreaZips: agent.service_area_zips ?? [],
      activeListings: Number(agent.active_listings),
      closedDeals: Number(agent.closed_deals),
      listings: listingsResult.rows.map((l) => ({
        id: l.id,
        slug: l.slug,
        addressLine1: l.address_line1,
        city: l.city,
        state: l.state,
        zip: l.zip,
        price: Number(l.price),
        bedrooms: l.bedrooms,
        bathrooms: Number(l.bathrooms),
        sqft: l.sqft,
        propertyType: l.property_type,
        status: l.status,
        primaryImageUrl: l.primary_image_url,
        listedAt: l.listed_at,
      })),
    })
  })
})
