/**
 * Elasticsearch index setup script.
 *
 * Creates the `listings` index with the full production mapping.
 * Safe to run repeatedly — skips creation if the index already exists.
 *
 * Usage:
 *   pnpm --filter @propnest/api es:setup
 */

import { esClient } from '../../src/config/es.js'

const INDEX = 'listings'

async function main() {
  const exists = await esClient.indices.exists({ index: INDEX })

  if (exists) {
    console.log(`[es:setup] Index "${INDEX}" already exists — skipping creation.`)
    await esClient.close()
    return
  }

  await esClient.indices.create({
    index: INDEX,
    body: {
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        analysis: {
          analyzer: {
            english_standard: {
              type: 'standard',
              stopwords: '_english_',
            },
          },
        },
      },
      mappings: {
        properties: {
          listingId:       { type: 'keyword' },
          status:          { type: 'keyword' },
          propertyType:    { type: 'keyword' },
          slug:            { type: 'keyword' },

          // Address — searchable text + exact keyword sub-field for aggs
          addressLine1: {
            type: 'text',
            fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          },
          city: {
            type: 'text',
            fields: { keyword: { type: 'keyword', ignore_above: 100 } },
          },
          state:           { type: 'keyword' },
          zip:             { type: 'keyword' },

          description:     { type: 'text', analyzer: 'english_standard' },

          // Numeric filters
          price:           { type: 'double' },
          bedrooms:        { type: 'integer' },
          bathrooms:       { type: 'float' },
          sqft:            { type: 'integer' },
          yearBuilt:       { type: 'integer' },

          // JSONB features array stored as keyword array
          features:        { type: 'keyword' },

          // Geospatial
          location:        { type: 'geo_point' },

          // Stored but not indexed (used for display only)
          primaryImageUrl: { type: 'keyword', index: false, doc_values: false },

          // Dates
          listedAt:        { type: 'date' },
          pendingAt:       { type: 'date' },
        },
      },
    },
  })

  console.log(`[es:setup] Index "${INDEX}" created successfully.`)
  await esClient.close()
}

main().catch((err) => {
  console.error('[es:setup] Fatal error:', err)
  process.exit(1)
})
