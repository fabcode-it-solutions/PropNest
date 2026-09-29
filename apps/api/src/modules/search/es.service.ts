import { esClient } from '../../config/es.js'
import type { SearchFilters, GeoFilter } from '@propnest/shared-types'

export const LISTINGS_INDEX = 'listings'

export async function setupIndex() {
  const exists = await esClient.indices.exists({ index: LISTINGS_INDEX })
  if (exists) return

  await esClient.indices.create({
    index: LISTINGS_INDEX,
    body: {
      mappings: {
        properties: {
          listingId:    { type: 'keyword' },
          status:       { type: 'keyword' },
          propertyType: { type: 'keyword' },
          slug:         { type: 'keyword' },
          city:         { type: 'keyword' },
          state:        { type: 'keyword' },
          zip:          { type: 'keyword' },
          addressLine1: { type: 'text' },
          description:  { type: 'text' },
          price:        { type: 'double' },
          bedrooms:     { type: 'integer' },
          bathrooms:    { type: 'float' },
          sqft:         { type: 'integer' },
          yearBuilt:    { type: 'integer' },
          features:     { type: 'object', dynamic: true },
          location:     { type: 'geo_point' },
          primaryImageUrl: { type: 'keyword', index: false },
          listedAt:     { type: 'date' },
        },
      },
    },
  })
}

export async function upsertListing(listing: Record<string, unknown>) {
  await esClient.index({
    index: LISTINGS_INDEX,
    id: listing.id as string,
    document: {
      listingId:    listing.id,
      status:       listing.status,
      propertyType: listing.property_type,
      slug:         listing.slug,
      addressLine1: listing.address_line1,
      city:         listing.city,
      state:        listing.state,
      zip:          listing.zip,
      description:  listing.description,
      price:        listing.price,
      bedrooms:     listing.bedrooms,
      bathrooms:    listing.bathrooms,
      sqft:         listing.sqft,
      yearBuilt:    listing.year_built,
      features:     listing.features && typeof listing.features === 'object' && !Array.isArray(listing.features)
        ? Object.keys(listing.features as Record<string, unknown>).filter(k => (listing.features as Record<string, unknown>)[k])
        : (listing.features ?? []),
      primaryImageUrl: listing.primary_image_url,
      listedAt:     listing.listed_at,
      location:     listing.lat && listing.lng
        ? { lat: listing.lat, lon: listing.lng }
        : null,
    },
  })
}

export async function deleteListing(listingId: string) {
  await esClient.delete({ index: LISTINGS_INDEX, id: listingId }).catch(() => {})
}

export async function searchListings(
  filters: SearchFilters,
  page = 1,
  pageSize = 20,
  sortBy = 'listed_at_desc'
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const must: any[] = [{ term: { status: 'active' } }]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any[] = []

  if (filters.q) {
    must.push({
      multi_match: {
        query: filters.q,
        fields: ['addressLine1^3', 'city^2', 'description', 'zip'],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    })
  }

  if (filters.minPrice || filters.maxPrice) {
    filter.push({ range: { price: { gte: filters.minPrice, lte: filters.maxPrice } } })
  }
  if (filters.minBedrooms) filter.push({ range: { bedrooms: { gte: filters.minBedrooms } } })
  if (filters.minBathrooms) filter.push({ range: { bathrooms: { gte: filters.minBathrooms } } })
  if (filters.propertyTypes?.length) filter.push({ terms: { propertyType: filters.propertyTypes } })

  // Geo filter
  if (filters.geo) {
    const geo = filters.geo as GeoFilter
    if (geo.type === 'radius' && geo.center && geo.radiusKm) {
      filter.push({
        geo_distance: {
          distance: `${geo.radiusKm}km`,
          location: { lat: geo.center[1], lon: geo.center[0] },
        },
      })
    } else if (geo.type === 'bbox' && geo.bbox) {
      filter.push({
        geo_bounding_box: {
          location: {
            top_left: { lat: geo.bbox[3], lon: geo.bbox[0] },
            bottom_right: { lat: geo.bbox[1], lon: geo.bbox[2] },
          },
        },
      })
    } else if (geo.type === 'polygon' && geo.polygon) {
      filter.push({
        geo_polygon: {
          location: {
            points: geo.polygon.map(([lon, lat]) => ({ lat, lon })),
          },
        },
      })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortMap: Record<string, any[]> = {
    price_asc:      [{ price: 'asc' }],
    price_desc:     [{ price: 'desc' }],
    listed_at_desc: [{ listedAt: { order: 'desc', missing: '_last' } }],
    relevance:      ['_score'],
  }

  const result = await esClient.search({
    index: LISTINGS_INDEX,
    from: (page - 1) * pageSize,
    size: pageSize,
    query: { bool: { must, filter } },
    sort: sortMap[sortBy] ?? sortMap.listed_at_desc,
  })

  return {
    data: result.hits.hits.map((h) => ({ ...(h._source as object), _score: h._score })),
    total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil(
      (typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value ?? 0)
      / pageSize
    ),
  }
}

export async function suggest(q: string) {
  const result = await esClient.search({
    index: LISTINGS_INDEX,
    size: 8,
    query: {
      multi_match: {
        query: q,
        fields: ['city^3', 'addressLine1'],
        type: 'phrase_prefix',
      },
    },
    _source: ['city', 'state', 'zip', 'addressLine1', 'slug'],
  })
  return result.hits.hits.map((h) => h._source)
}
