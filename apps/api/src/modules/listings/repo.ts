import { query } from '../../config/db.js'
import type { CreateListingInput, UpdateListingInput } from './schema.js'

function slugify(city: string, address: string): string {
  return `${city}-${address}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function createListing(data: CreateListingInput & { agentId: string; sellerId: string }) {
  const slug = slugify(data.city, data.addressLine1)
  const { rows } = await query(
    `INSERT INTO listings
       (agent_id, seller_id, property_type, address_line1, city, state, zip,
        location, price, bedrooms, bathrooms, sqft, year_built, description,
        features, slug, hoa_monthly)
     VALUES ($1,$2,$3,$4,$5,$6,$7,
             ST_SetSRID(ST_MakePoint($9,$8),4326),
             $10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`,
    [
      data.agentId, data.sellerId, data.propertyType,
      data.addressLine1, data.city, data.state, data.zip,
      data.lat, data.lng,
      data.price, data.bedrooms, data.bathrooms, data.sqft,
      data.yearBuilt ?? null, data.description ?? null,
      JSON.stringify(data.features ?? {}),
      slug, data.hoaMonthly ?? null,
    ]
  )
  return rows[0]
}

export async function findListingById(id: string) {
  const { rows } = await query(
    `SELECT l.*,
            ST_Y(l.location::geometry) AS lat,
            ST_X(l.location::geometry) AS lng,
            json_agg(li ORDER BY li.sort_order) FILTER (WHERE li.id IS NOT NULL) AS images
     FROM listings l
     LEFT JOIN listing_images li ON li.listing_id = l.id
     WHERE l.id = $1
     GROUP BY l.id`,
    [id]
  )
  return rows[0] ?? null
}

export async function findListingBySlug(slug: string) {
  const { rows } = await query(
    `SELECT l.*,
            ST_Y(l.location::geometry) AS lat,
            ST_X(l.location::geometry) AS lng,
            json_agg(li ORDER BY li.sort_order) FILTER (WHERE li.id IS NOT NULL) AS images
     FROM listings l
     LEFT JOIN listing_images li ON li.listing_id = l.id
     WHERE l.slug = $1
     GROUP BY l.id`,
    [slug]
  )
  return rows[0] ?? null
}

export async function updateListing(id: string, data: UpdateListingInput) {
  const setClauses: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (data.price !== undefined)       { setClauses.push(`price = $${idx++}`);       values.push(data.price) }
  if (data.description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(data.description) }
  if (data.features !== undefined)    { setClauses.push(`features = $${idx++}`);    values.push(JSON.stringify(data.features)) }
  if (data.bedrooms !== undefined)    { setClauses.push(`bedrooms = $${idx++}`);    values.push(data.bedrooms) }
  if (data.bathrooms !== undefined)   { setClauses.push(`bathrooms = $${idx++}`);   values.push(data.bathrooms) }
  if (data.sqft !== undefined)        { setClauses.push(`sqft = $${idx++}`);        values.push(data.sqft) }
  if (data.hoaMonthly !== undefined)  { setClauses.push(`hoa_monthly = $${idx++}`); values.push(data.hoaMonthly) }
  if (data.yearBuilt !== undefined)   { setClauses.push(`year_built = $${idx++}`);  values.push(data.yearBuilt) }
  if (data.lat !== undefined && data.lng !== undefined) {
    setClauses.push(`location = ST_SetSRID(ST_MakePoint($${idx++},$${idx++}),4326)`)
    values.push(data.lng, data.lat)
  }

  if (setClauses.length === 0) return null

  values.push(id)
  const { rows } = await query(
    `UPDATE listings SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  return rows[0] ?? null
}

export async function updateListingStatus(
  id: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const setExtra: string[] = []
  const values: unknown[] = [status]
  let idx = 2

  if (status === 'active' && !extra.listed_at)   { setExtra.push(`listed_at = COALESCE(listed_at, now())`) }
  if (status === 'pending')  { setExtra.push(`pending_at = now()`) }
  if (status === 'sold')     { setExtra.push(`sold_at = now()`) }
  if (status === 'active' && extra.reopen)        { setExtra.push(`pending_at = NULL`) }

  const extraClause = setExtra.length > 0 ? ', ' + setExtra.join(', ') : ''
  values.push(id)
  const { rows } = await query(
    `UPDATE listings SET status = $1${extraClause} WHERE id = $${idx} RETURNING *`,
    values
  )
  return rows[0]
}

export async function getListingImageCount(listingId: string): Promise<number> {
  const { rows } = await query<{ count: string }>(
    `SELECT count(*) FROM listing_images WHERE listing_id = $1`,
    [listingId]
  )
  return parseInt(rows[0]?.count ?? '0')
}

export async function listListings(filters: {
  page: number; pageSize: number; status?: string; agentId?: string
  minPrice?: number; maxPrice?: number
}) {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (filters.status)   { conditions.push(`l.status = $${idx++}`);    values.push(filters.status) }
  if (filters.agentId)  { conditions.push(`l.agent_id = $${idx++}`);  values.push(filters.agentId) }
  if (filters.minPrice) { conditions.push(`l.price >= $${idx++}`);    values.push(filters.minPrice) }
  if (filters.maxPrice) { conditions.push(`l.price <= $${idx++}`);    values.push(filters.maxPrice) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (filters.page - 1) * filters.pageSize

  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT l.*, ST_Y(l.location::geometry) AS lat, ST_X(l.location::geometry) AS lng
       FROM listings l ${where}
       ORDER BY l.listed_at DESC NULLS LAST, l.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, filters.pageSize, offset]
    ),
    query<{ count: string }>(
      `SELECT count(*) FROM listings l ${where}`,
      values
    ),
  ])

  return {
    data: dataResult.rows,
    total: parseInt(countResult.rows[0]?.count ?? '0'),
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.ceil(parseInt(countResult.rows[0]?.count ?? '0') / filters.pageSize),
  }
}

// Images
export async function createListingImage(data: {
  listingId: string; cloudinaryPublicId: string; url: string
  width: number; height: number; sortOrder: number; isPrimary: boolean
}) {
  const { rows } = await query(
    `INSERT INTO listing_images (listing_id, cloudinary_public_id, url, width, height, sort_order, is_primary)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.listingId, data.cloudinaryPublicId, data.url, data.width, data.height, data.sortOrder, data.isPrimary]
  )
  return rows[0]
}

export async function deleteListingImage(imageId: string, listingId: string) {
  await query(`DELETE FROM listing_images WHERE id = $1 AND listing_id = $2`, [imageId, listingId])
}

export async function setPrimaryImage(listingId: string, imageId: string) {
  await query(`UPDATE listing_images SET is_primary = false WHERE listing_id = $1`, [listingId])
  await query(`UPDATE listing_images SET is_primary = true WHERE id = $1`, [imageId])
  const { rows } = await query<{ url: string }>(
    `SELECT url FROM listing_images WHERE id = $1`, [imageId]
  )
  if (rows[0]) {
    await query(`UPDATE listings SET primary_image_url = $1 WHERE id = $2`, [rows[0].url, listingId])
  }
}
