import { query } from '../../config/db.js'

export async function createOffer(data: {
  listingId: string; buyerId: string; agentId?: string; parentOfferId?: string
  price: number; financingContingency: boolean; inspectionContingency: boolean
  appraisalContingency: boolean; closingDate: string; earnestMoney: number
  message?: string; expiryAt?: string; idempotencyKey: string
}) {
  const { rows } = await query(
    `INSERT INTO offers
       (listing_id, buyer_id, agent_id, parent_offer_id, price, financing_contingency,
        inspection_contingency, appraisal_contingency, closing_date, earnest_money,
        message, expiry_at, idempotency_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      data.listingId, data.buyerId, data.agentId ?? null, data.parentOfferId ?? null,
      data.price, data.financingContingency, data.inspectionContingency,
      data.appraisalContingency, data.closingDate, data.earnestMoney,
      data.message ?? null, data.expiryAt ?? null, data.idempotencyKey,
    ]
  )
  return rows[0]
}

export async function findOfferById(id: string) {
  const { rows } = await query(`SELECT * FROM offers WHERE id = $1`, [id])
  return rows[0] ?? null
}

export async function findOfferByIdempotencyKey(key: string) {
  const { rows } = await query(`SELECT * FROM offers WHERE idempotency_key = $1`, [key])
  return rows[0] ?? null
}

export async function getOfferChain(offerId: string): Promise<unknown[]> {
  const { rows } = await query(
    `WITH RECURSIVE chain AS (
       SELECT *, 1 AS round FROM offers WHERE id = $1
       UNION ALL
       SELECT o.*, c.round + 1 FROM offers o JOIN chain c ON c.id = o.parent_offer_id
     )
     SELECT * FROM chain ORDER BY round`,
    [offerId]
  )
  return rows
}

export async function getOffersForListing(listingId: string) {
  const { rows } = await query(
    `SELECT o.*, u.first_name, u.last_name, u.email
     FROM offers o JOIN users u ON u.id = o.buyer_id
     WHERE o.listing_id = $1 AND o.parent_offer_id IS NULL
     ORDER BY o.created_at DESC`,
    [listingId]
  )
  return rows
}

export async function getBuyerOffers(buyerId: string) {
  const { rows } = await query(
    `SELECT o.*, l.address_line1, l.city, l.slug, l.primary_image_url, l.status AS listing_status
     FROM offers o JOIN listings l ON l.id = o.listing_id
     WHERE o.buyer_id = $1 ORDER BY o.created_at DESC`,
    [buyerId]
  )
  return rows
}

export async function updateOfferStatus(id: string, status: string) {
  const { rows } = await query(
    `UPDATE offers SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  )
  return rows[0]
}

export async function rejectOtherOffers(listingId: string, acceptedOfferId: string) {
  await query(
    `UPDATE offers SET status = 'rejected'
     WHERE listing_id = $1 AND id != $2 AND status = 'submitted'`,
    [listingId, acceptedOfferId]
  )
}
