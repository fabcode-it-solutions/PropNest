import { Worker } from 'bullmq'
import { redis } from '../../config/redis.js'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const connection = redis as any
import { query } from '../../config/db.js'
import { emitter } from '../../shared/events/emitter.js'
import { esClient } from '../../config/es.js'
import { notificationsQueue, scheduledQueue } from '../../shared/queues/queue-registry.js'

export const scheduledWorker = new Worker(
  'scheduled',
  async (job) => {

    // ── showing-reminder ─────────────────────────────────────────────────────
    if (job.name === 'showing-reminder') {
      const { showingId, windowHours } = job.data as { showingId: string; windowHours: 24 | 1 }

      const flagField = windowHours === 24 ? 'reminder_24h_sent' : 'reminder_1h_sent'

      const res = await query<{
        id: string
        listing_id: string
        buyer_id: string
        agent_id: string
        scheduled_at: string
        status: string
        reminder_24h_sent: boolean
        reminder_1h_sent: boolean
      }>(
        `SELECT id, listing_id, buyer_id, agent_id, scheduled_at, status,
                reminder_24h_sent, reminder_1h_sent
         FROM showings WHERE id = $1`,
        [showingId]
      )

      const showing = res.rows[0]
      if (!showing) return
      if (showing.status !== 'confirmed') return
      if (showing[flagField as keyof typeof showing]) return // already sent

      // Mark flag to prevent double-send on retry
      await query(`UPDATE showings SET ${flagField} = TRUE WHERE id = $1`, [showingId])

      emitter.emit('showing.reminder', {
        showingId: showing.id,
        listingId: showing.listing_id,
        buyerId: showing.buyer_id,
        agentId: showing.agent_id,
        scheduledAt: showing.scheduled_at,
        windowHours,
      })
    }

    // ── offer-expiry ─────────────────────────────────────────────────────────
    if (job.name === 'offer-expiry') {
      const res = await query<{
        id: string
        listing_id: string
        buyer_id: string
      }>(
        `UPDATE offers
         SET status = 'expired'
         WHERE status IN ('submitted', 'countered')
           AND expiry_at IS NOT NULL
           AND expiry_at < NOW()
         RETURNING id, listing_id, buyer_id`
      )

      for (const row of res.rows) {
        emitter.emit('offer.expired', {
          offerId: row.id,
          listingId: row.listing_id,
          buyerId: row.buyer_id,
        })
      }
    }

    // ── saved-search-match ───────────────────────────────────────────────────
    if (job.name === 'saved-search-match') {
      const searchRes = await query<{
        id: string
        buyer_id: string
        filters: Record<string, unknown>
        last_matched_at: string | null
      }>(
        `SELECT id, buyer_id, filters, last_matched_at
         FROM saved_searches
         WHERE is_active = TRUE AND alert_frequency = 'immediate'`
      )

      for (const savedSearch of searchRes.rows) {
        try {
          const sinceDate = savedSearch.last_matched_at ?? new Date(0).toISOString()
          const filters = savedSearch.filters as any

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mustFilters: any[] = [
            { term: { status: 'active' } },
            { range: { listed_at: { gte: sinceDate } } },
          ]

          if (filters.minPrice || filters.maxPrice) {
            const priceRange: Record<string, number> = {}
            if (filters.minPrice) priceRange.gte = filters.minPrice
            if (filters.maxPrice) priceRange.lte = filters.maxPrice
            mustFilters.push({ range: { price: priceRange } })
          }
          if (filters.minBedrooms) {
            mustFilters.push({ range: { bedrooms: { gte: filters.minBedrooms } } })
          }
          if (filters.propertyTypes?.length) {
            mustFilters.push({ terms: { property_type: filters.propertyTypes } })
          }

          const esResult = await esClient.search<{ id: string }>({
            index: 'listings',
            query: { bool: { filter: mustFilters } },
            _source: ['id'],
            size: 50,
          })

          const listingIds = esResult.hits.hits.map((h) => h._source!.id)

          if (listingIds.length > 0) {
            await query(
              `UPDATE saved_searches SET last_matched_at = NOW(), last_alerted_at = NOW() WHERE id = $1`,
              [savedSearch.id]
            )

            emitter.emit('saved_search.matched', {
              savedSearchId: savedSearch.id,
              buyerId: savedSearch.buyer_id,
              listingIds,
            })
          }
        } catch (err) {
          console.error(`[saved-search-match] Error for search ${savedSearch.id}:`, err)
        }
      }
    }
  },
  {
    connection,
    concurrency: 1,
  }
)

scheduledWorker.on('failed', (job, err) => {
  console.error(`[scheduled-worker] Job ${job?.id} (${job?.name}) failed:`, err.message)
})

// ── Repeatable jobs (registered once at startup) ──────────────────────────

export async function registerRepeatableJobs(): Promise<void> {
  // Offer expiry check every 5 minutes
  await scheduledQueue.add(
    'offer-expiry',
    {},
    { repeat: { every: 5 * 60 * 1000 }, jobId: 'offer-expiry-repeatable' }
  )

  // Saved search matching every 15 minutes
  await scheduledQueue.add(
    'saved-search-match',
    {},
    { repeat: { every: 15 * 60 * 1000 }, jobId: 'saved-search-match-repeatable' }
  )
}
