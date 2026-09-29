import { query } from '../../config/db.js'

export async function createShowing(data: {
  listingId: string; buyerId: string; agentId: string
  scheduledAt: string; durationMinutes: number; notes?: string
}) {
  const { rows } = await query(
    `INSERT INTO showings (listing_id, buyer_id, agent_id, scheduled_at, duration_minutes, notes)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.listingId, data.buyerId, data.agentId, data.scheduledAt, data.durationMinutes, data.notes ?? null]
  )
  return rows[0]
}

export async function findShowingById(id: string) {
  const { rows } = await query(`SELECT * FROM showings WHERE id = $1`, [id])
  return rows[0] ?? null
}

export async function listShowingsByListing(listingId: string) {
  const { rows } = await query(
    `SELECT s.*, u.first_name, u.last_name, u.email FROM showings s
     JOIN users u ON u.id = s.buyer_id
     WHERE s.listing_id = $1 ORDER BY s.scheduled_at`,
    [listingId]
  )
  return rows
}

export async function listShowingsByUser(userId: string, role: string) {
  const col = role === 'buyer' ? 'buyer_id' : 'agent_id'
  const { rows } = await query(
    `SELECT s.*, l.address_line1, l.city, l.slug, l.primary_image_url
     FROM showings s JOIN listings l ON l.id = s.listing_id
     WHERE s.${col} = $1 ORDER BY s.scheduled_at`,
    [userId]
  )
  return rows
}

export async function confirmShowing(id: string) {
  const { rows } = await query(
    `UPDATE showings SET status = 'confirmed', confirmed_at = now() WHERE id = $1 RETURNING *`,
    [id]
  )
  return rows[0]
}

export async function cancelShowing(id: string, cancelledBy: string) {
  const { rows } = await query(
    `UPDATE showings SET status = 'cancelled', cancelled_at = now() WHERE id = $1 RETURNING *`,
    [id]
  )
  return rows[0]
}
