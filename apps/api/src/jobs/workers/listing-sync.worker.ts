import { Worker } from 'bullmq'
import { redis } from '../../config/redis.js'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const connection = redis as any
import { esClient } from '../../config/es.js'
import { query } from '../../config/db.js'
import { env } from '../../config/env.js'

const INDEX = 'listings'

interface ListingRow {
  id: string
  status: string
  slug: string
  description: string
  address_line1: string
  city: string
  state: string
  zip: string
  price: number
  bedrooms: number
  bathrooms: number
  sqft: number | null
  year_built: number | null
  property_type: string
  features: string[]
  lng: number
  lat: number
  primary_image_url: string | null
  listed_at: string | null
  pending_at: string | null
}

export const listingSyncWorker = new Worker(
  'listing-sync',
  async (job) => {
    const { listingId } = job.data as { listingId: string }

    if (job.name === 'delete-listing') {
      await esClient.delete({ index: INDEX, id: listingId }).catch(() => {/* already gone */})
      return
    }

    // upsert-listing: fetch from Postgres, upsert to ES
    const res = await query<ListingRow>(
      `SELECT l.id, l.status, l.slug, l.address_line1,
              l.description, l.city, l.state, l.zip,
              l.price::float AS price, l.bedrooms,
              l.bathrooms::float AS bathrooms, l.sqft, l.year_built,
              l.property_type, l.features, l.primary_image_url,
              l.listed_at, l.pending_at,
              ST_X(l.location::geometry) as lng,
              ST_Y(l.location::geometry) as lat
       FROM listings l WHERE l.id = $1`,
      [listingId]
    )

    if (!res.rows[0]) return // deleted

    const row = res.rows[0]
    await esClient.index({
      index: INDEX,
      id: row.id,
      document: {
        id: row.id,
        status: row.status,
        slug: row.slug,
        addressLine1: row.address_line1,
        description: row.description,
        city: row.city,
        state: row.state,
        zip: row.zip,
        price: row.price,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        sqft: row.sqft,
        yearBuilt: row.year_built,
        propertyType: row.property_type,
        features: Array.isArray(row.features)
          ? row.features
          : row.features && typeof row.features === 'object'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? Object.keys(row.features as any).filter(k => (row.features as any)[k])
            : [],
        location: row.lat != null && row.lng != null ? { lat: row.lat, lon: row.lng } : undefined,
        primaryImageUrl: row.primary_image_url,
        listedAt: row.listed_at,
        pendingAt: row.pending_at,
      },
    })
  },
  {
    connection: connection,
    concurrency: 2,
  }
)

listingSyncWorker.on('failed', (job, err) => {
  console.error(`[listing-sync-worker] Job ${job?.id} failed:`, err.message)
})
