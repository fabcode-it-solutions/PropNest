/**
 * Elasticsearch seed script — syncs all active DB listings into the `listings` index.
 *
 * Run AFTER `pnpm db:seed` and `pnpm es:setup`.
 *
 * Usage:
 *   pnpm --filter @propnest/api es:seed
 */

import { query } from '../../src/config/db.js'
import { esClient } from '../../src/config/es.js'
import { setupIndex, upsertListing, LISTINGS_INDEX } from '../../src/modules/search/es.service.js'

async function main() {
  // Ensure index exists
  await setupIndex()
  console.log(`[es:seed] Index "${LISTINGS_INDEX}" ready.`)

  // Fetch all listings with coordinates
  const res = await query<{
    id: string
    status: string
    property_type: string
    slug: string
    address_line1: string
    city: string
    state: string
    zip: string
    description: string | null
    price: number
    bedrooms: number
    bathrooms: number
    sqft: number | null
    year_built: number | null
    features: Record<string, unknown> | null
    primary_image_url: string | null
    listed_at: string | null
    lat: number | null
    lng: number | null
  }>(`
    SELECT
      l.id, l.status, l.property_type, l.slug,
      l.address_line1, l.city, l.state, l.zip,
      l.description, l.price, l.bedrooms, l.bathrooms,
      l.sqft, l.year_built, l.features, l.primary_image_url,
      l.listed_at,
      ST_X(l.location::geometry) AS lng,
      ST_Y(l.location::geometry) AS lat
    FROM listings l
    WHERE l.status != 'withdrawn'
    ORDER BY l.listed_at DESC
  `)

  if (res.rows.length === 0) {
    console.log('[es:seed] No listings found in DB — run pnpm db:seed first.')
    await esClient.close()
    return
  }

  // Bulk upsert in batches of 50
  const BATCH = 50
  let indexed = 0

  for (let i = 0; i < res.rows.length; i += BATCH) {
    const batch = res.rows.slice(i, i + BATCH)

    const operations = batch.flatMap((listing) => [
      { index: { _index: LISTINGS_INDEX, _id: listing.id } },
      {
        listingId:       listing.id,
        status:          listing.status,
        propertyType:    listing.property_type,
        slug:            listing.slug,
        addressLine1:    listing.address_line1,
        city:            listing.city,
        state:           listing.state,
        zip:             listing.zip,
        description:     listing.description,
        price:           listing.price,
        bedrooms:        listing.bedrooms,
        bathrooms:       listing.bathrooms,
        sqft:            listing.sqft,
        yearBuilt:       listing.year_built,
        features:        listing.features,
        primaryImageUrl: listing.primary_image_url,
        listedAt:        listing.listed_at,
        location:
          listing.lat != null && listing.lng != null
            ? { lat: listing.lat, lon: listing.lng }
            : null,
      },
    ])

    const result = await esClient.bulk({ operations, refresh: true })

    if (result.errors) {
      const failed = result.items.filter((item) => item.index?.error)
      console.error(`[es:seed] ${failed.length} errors in batch ${i / BATCH + 1}:`, failed[0]?.index?.error)
    }

    indexed += batch.length
    console.log(`[es:seed] ${indexed}/${res.rows.length} listings indexed…`)
  }

  console.log(`[es:seed] Done — ${indexed} listings in Elasticsearch.`)
  await esClient.close()
}

main().catch((err) => {
  console.error('[es:seed] Fatal:', err)
  process.exit(1)
})
