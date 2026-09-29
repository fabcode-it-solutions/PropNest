import { emitter } from '../../../shared/events/emitter.js'
import { notificationsQueue } from '../../../shared/queues/queue-registry.js'
import { emitToUser, emitToRoom } from '../../../shared/websockets/io.js'
import { createNotification } from '../repo.js'
import { query } from '../../../config/db.js'

// ── helpers ────────────────────────────────────────────────────────────────

async function getUserEmail(userId: string): Promise<string | null> {
  const res = await query<{ email: string }>(
    `SELECT email FROM users WHERE id = $1`,
    [userId]
  )
  return res.rows[0]?.email ?? null
}

async function getUserName(userId: string): Promise<string> {
  const res = await query<{ first_name: string; last_name: string }>(
    `SELECT first_name, last_name FROM users WHERE id = $1`,
    [userId]
  )
  const row = res.rows[0]
  return row ? `${row.first_name} ${row.last_name}` : 'User'
}

async function getListingAddress(listingId: string): Promise<string> {
  const res = await query<{ address_line1: string; city: string; state: string }>(
    `SELECT address_line1, city, state FROM listings WHERE id = $1`,
    [listingId]
  )
  const row = res.rows[0]
  return row ? `${row.address_line1}, ${row.city}, ${row.state}` : 'the property'
}

async function notify(opts: {
  userId: string
  type: string
  title: string
  body: string
  payload?: Record<string, unknown>
  emailTemplate?: string
  emailData?: Record<string, unknown>
  socketEvent?: string
  socketData?: unknown
  socketRoom?: string
}): Promise<void> {
  const notification = await createNotification({
    userId: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    payload: opts.payload,
  })

  // Real-time socket push
  const room = opts.socketRoom ?? `user:${opts.userId}`
  emitToRoom(room, opts.socketEvent ?? opts.type, {
    notification,
    ...((opts.socketData as object) ?? {}),
  })

  // Enqueue email
  if (opts.emailTemplate && opts.emailData) {
    const email = await getUserEmail(opts.userId)
    if (email) {
      await notificationsQueue.add('send-email', {
        to: email,
        template: opts.emailTemplate,
        data: opts.emailData,
        notificationId: notification.id,
      })
    }
  }
}

// ── Listeners ──────────────────────────────────────────────────────────────

export function registerNotificationListeners(): void {

  // ── Offer received → notify agent/seller ─────────────────────────────────
  emitter.on('offer.received', async (payload) => {
    const [address, buyerName, agentName] = await Promise.all([
      getListingAddress(payload.listingId),
      getUserName(payload.buyerId),
      getUserName(payload.agentId),
    ])

    const agentEmail = await getUserEmail(payload.agentId)

    await notify({
      userId: payload.agentId,
      type: 'offer.received',
      title: `New offer on ${address}`,
      body: `${buyerName} submitted an offer of $${payload.price.toLocaleString()}`,
      payload,
      emailTemplate: 'offerReceived',
      emailData: { agentName, address, price: payload.price, buyerName },
      socketEvent: 'offer:received',
      socketRoom: `agent-crm:${payload.agentId}`,
    })
  })

  // ── Offer countered → notify buyer ────────────────────────────────────────
  emitter.on('offer.countered', async (payload) => {
    const [address, buyerName] = await Promise.all([
      getListingAddress(payload.listingId),
      getUserName(payload.buyerId),
    ])

    await notify({
      userId: payload.buyerId,
      type: 'offer.countered',
      title: `Counter offer on ${address}`,
      body: `The seller countered at $${payload.price.toLocaleString()}`,
      payload,
      emailTemplate: 'offerCountered',
      emailData: { buyerName, address, counterPrice: payload.price },
      socketEvent: 'offer:countered',
    })
  })

  // ── Offer accepted → notify buyer ────────────────────────────────────────
  emitter.on('offer.accepted', async (payload) => {
    const [address, buyerName] = await Promise.all([
      getListingAddress(payload.listingId),
      getUserName(payload.buyerId),
    ])

    // Get the offer price
    const offerRes = await query<{ price: number }>(
      `SELECT price FROM offers WHERE id = $1`,
      [payload.offerId]
    )
    const price = offerRes.rows[0]?.price ?? 0

    await notify({
      userId: payload.buyerId,
      type: 'offer.accepted',
      title: `Your offer was accepted!`,
      body: `Your offer on ${address} has been accepted. A transaction has been opened.`,
      payload,
      emailTemplate: 'offerAccepted',
      emailData: { buyerName, address, price },
      socketEvent: 'offer:accepted',
    })

    // Socket update for agent CRM
    const agentRes = await query<{ agent_id: string }>(
      `SELECT agent_id FROM listings WHERE id = $1`,
      [payload.listingId]
    )
    if (agentRes.rows[0]) {
      emitToRoom(`agent-crm:${agentRes.rows[0].agent_id}`, 'listing:status_changed', {
        listingId: payload.listingId,
        newStatus: 'pending',
      })
    }
  })

  // ── Offer rejected → notify buyer ────────────────────────────────────────
  emitter.on('offer.rejected', async (payload) => {
    const address = await getListingAddress(payload.listingId)
    await notify({
      userId: payload.buyerId,
      type: 'offer.rejected',
      title: `Offer rejected on ${address}`,
      body: `Your offer on ${address} was not accepted.`,
      payload,
      socketEvent: 'offer:rejected',
    })
  })

  // ── Offer expired → notify buyer ─────────────────────────────────────────
  emitter.on('offer.expired', async (payload) => {
    const address = await getListingAddress(payload.listingId)
    await notify({
      userId: payload.buyerId,
      type: 'offer.expired',
      title: `Offer expired on ${address}`,
      body: `Your offer on ${address} has expired.`,
      payload,
      socketEvent: 'offer:expired',
    })
  })

  // ── Showing requested → notify agent ─────────────────────────────────────
  emitter.on('showing.requested', async (payload) => {
    const [address, buyerName] = await Promise.all([
      getListingAddress(payload.listingId),
      getUserName(payload.buyerId),
    ])

    const scheduledDate = new Date(payload.scheduledAt).toLocaleString()
    await notify({
      userId: payload.agentId,
      type: 'showing.requested',
      title: `Showing request for ${address}`,
      body: `${buyerName} requested a showing at ${scheduledDate}`,
      payload,
      socketEvent: 'showing:requested',
      socketRoom: `agent-crm:${payload.agentId}`,
    })
  })

  // ── Showing confirmed → notify buyer ─────────────────────────────────────
  emitter.on('showing.confirmed', async (payload) => {
    const [address, buyerName] = await Promise.all([
      getListingAddress(payload.listingId),
      getUserName(payload.buyerId),
    ])

    await notify({
      userId: payload.buyerId,
      type: 'showing.confirmed',
      title: `Showing confirmed at ${address}`,
      body: `Your showing at ${address} is confirmed for ${new Date(payload.scheduledAt).toLocaleString()}`,
      payload,
      emailTemplate: 'showingConfirmed',
      emailData: { buyerName, address, scheduledAt: payload.scheduledAt },
      socketEvent: 'showing:confirmed',
    })
  })

  // ── Showing cancelled → notify all parties ───────────────────────────────
  emitter.on('showing.cancelled', async (payload) => {
    const [address, cancellerName] = await Promise.all([
      getListingAddress(payload.listingId),
      getUserName(payload.cancelledBy),
    ])

    const otherParty = payload.cancelledBy === payload.buyerId ? payload.agentId : payload.buyerId
    await notify({
      userId: otherParty,
      type: 'showing.cancelled',
      title: `Showing cancelled at ${address}`,
      body: `${cancellerName} cancelled the showing at ${address}`,
      payload,
      socketEvent: 'showing:cancelled',
    })
  })

  // ── Showing reminder → notify buyer + agent ───────────────────────────────
  emitter.on('showing.reminder', async (payload) => {
    const [address, buyerName, agentName] = await Promise.all([
      getListingAddress(payload.listingId),
      getUserName(payload.buyerId),
      getUserName(payload.agentId),
    ])

    await Promise.all([
      notify({
        userId: payload.buyerId,
        type: 'showing.reminder',
        title: `Showing in ${payload.windowHours} hour${payload.windowHours > 1 ? 's' : ''}`,
        body: `You have a showing at ${address} in ${payload.windowHours} hour${payload.windowHours > 1 ? 's' : ''}`,
        payload,
        emailTemplate: 'showingReminder',
        emailData: { name: buyerName, address, scheduledAt: payload.scheduledAt, windowHours: payload.windowHours },
        socketEvent: 'showing:reminder',
      }),
      notify({
        userId: payload.agentId,
        type: 'showing.reminder',
        title: `Showing in ${payload.windowHours} hour${payload.windowHours > 1 ? 's' : ''}`,
        body: `You have a showing at ${address} in ${payload.windowHours} hour${payload.windowHours > 1 ? 's' : ''}`,
        payload,
        emailTemplate: 'showingReminder',
        emailData: { name: agentName, address, scheduledAt: payload.scheduledAt, windowHours: payload.windowHours },
        socketEvent: 'showing:reminder',
      }),
    ])
  })

  // ── Transaction created → notify all parties ──────────────────────────────
  emitter.on('transaction.created', async (payload) => {
    const address = await getListingAddress(payload.listingId)
    const notifyIds = [payload.buyerId, payload.sellerId, payload.agentId].filter(Boolean)

    await Promise.all(
      notifyIds.map((userId) =>
        notify({
          userId,
          type: 'transaction.created',
          title: `Transaction opened for ${address}`,
          body: `A transaction has been opened for ${address}`,
          payload,
          socketEvent: 'transaction:created',
          socketRoom: `transaction:${payload.transactionId}`,
        })
      )
    )
  })

  // ── Mortgage stage changed → notify buyer ─────────────────────────────────
  emitter.on('mortgage.stage_changed', async (payload) => {
    const buyerName = await getUserName(payload.buyerId)
    const stageLabel = payload.newStage.replace(/_/g, ' ')

    await notify({
      userId: payload.buyerId,
      type: 'mortgage.stage_changed',
      title: `Mortgage update: ${stageLabel}`,
      body: `Your mortgage application has moved to ${stageLabel}`,
      payload,
      emailTemplate: 'mortgageStageChanged',
      emailData: { buyerName, newStage: payload.newStage, applicationId: payload.applicationId },
      socketEvent: 'mortgage:stage_changed',
      socketRoom: `mortgage:${payload.applicationId}`,
    })
  })

  // ── Mortgage final approved → notify buyer ────────────────────────────────
  emitter.on('mortgage.final_approved', async (payload) => {
    await notify({
      userId: payload.buyerId,
      type: 'mortgage.final_approved',
      title: 'Mortgage final approval!',
      body: 'Your mortgage application has received final approval.',
      payload,
      socketEvent: 'mortgage:final_approved',
      socketRoom: `mortgage:${payload.applicationId}`,
    })
  })

  // ── OCR completed → notify lender ─────────────────────────────────────────
  emitter.on('ocr.completed', async (payload) => {
    if (!payload.lenderId) return
    await notify({
      userId: payload.lenderId,
      type: 'ocr.completed',
      title: 'Document ready for review',
      body: 'A mortgage document has been processed and is ready for your review.',
      payload,
      socketEvent: 'ocr:completed',
      socketRoom: `mortgage:${payload.applicationId}`,
    })
  })

  // ── OCR failed → notify buyer ─────────────────────────────────────────────
  emitter.on('ocr.failed', async (payload) => {
    await notify({
      userId: payload.buyerId,
      type: 'ocr.failed',
      title: 'Document processing failed',
      body: 'We could not process your document. Please re-upload it.',
      payload,
      socketEvent: 'ocr:failed',
    })
  })

  // ── Saved search matched → notify buyer ───────────────────────────────────
  emitter.on('saved_search.matched', async (payload) => {
    const count = payload.listingIds.length

    // Get search name
    const searchRes = await query<{ name: string; buyer_id: string }>(
      `SELECT name FROM saved_searches WHERE id = $1`,
      [payload.savedSearchId]
    )
    const searchName = searchRes.rows[0]?.name ?? 'your saved search'
    const buyerName = await getUserName(payload.buyerId)

    await notify({
      userId: payload.buyerId,
      type: 'saved_search.matched',
      title: `${count} new listing${count > 1 ? 's' : ''} match "${searchName}"`,
      body: `We found ${count} new listing${count > 1 ? 's' : ''} matching "${searchName}"`,
      payload,
      emailTemplate: 'savedSearchMatch',
      emailData: { buyerName, searchName, listingCount: count },
      socketEvent: 'search:match',
    })
  })
}
