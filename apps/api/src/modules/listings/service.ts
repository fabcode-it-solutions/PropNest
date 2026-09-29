import * as repo from './repo.js'
import { applyListingTransition } from './listing.state-machine.js'
import { emitter } from '../../shared/events/emitter.js'
import { listingSyncQueue } from '../../shared/queues/queue-registry.js'
import type { CreateListingInput, UpdateListingInput } from './schema.js'
import type { ListingStatus } from '@propnest/shared-types'

export async function createListing(
  data: CreateListingInput & { agentId: string; sellerId: string }
) {
  return repo.createListing(data)
}

export async function getListingById(id: string) {
  const listing = await repo.findListingById(id)
  if (!listing) throw { statusCode: 404, message: 'Listing not found' }
  return listing
}

export async function getListingBySlug(slug: string) {
  const listing = await repo.findListingBySlug(slug)
  if (!listing) throw { statusCode: 404, message: 'Listing not found' }
  return listing
}

export async function updateListing(id: string, data: UpdateListingInput, requesterId: string, role: string) {
  const listing = await repo.findListingById(id)
  if (!listing) throw { statusCode: 404, message: 'Listing not found' }
  if (role !== 'admin' && listing.agent_id !== requesterId && listing.seller_id !== requesterId) {
    throw { statusCode: 403, message: 'Not authorized to edit this listing' }
  }
  return repo.updateListing(id, data)
}

export async function transitionListingStatus(
  id: string,
  action: string,
  requesterId: string,
  role: string
) {
  const listing = await repo.findListingById(id)
  if (!listing) throw { statusCode: 404, message: 'Listing not found' }

  if (role !== 'admin' && listing.agent_id !== requesterId) {
    throw { statusCode: 403, message: 'Only the listing agent or admin can change status' }
  }

  const imageCount = await repo.getListingImageCount(id)
  const newStatus = applyListingTransition(
    listing.status as ListingStatus,
    action,
    { imageCount, price: listing.price, hasLocation: true, role }
  )

  const extra = action === 'reopen' ? { reopen: true } : {}
  const updated = await repo.updateListingStatus(id, newStatus, extra)

  // Fire-and-forget: sync to Elasticsearch
  await listingSyncQueue.add(
    'upsert-listing',
    { listingId: id },
    { jobId: `listing:${id}:sync`, delay: 0 }
  )

  emitter.emit('listing.status_changed', {
    listingId: id,
    oldStatus: listing.status,
    newStatus,
  })

  if (action === 'publish') {
    emitter.emit('listing.published', { listingId: id, agentId: listing.agent_id })
  }

  return updated
}

export async function listListings(filters: Parameters<typeof repo.listListings>[0]) {
  return repo.listListings(filters)
}

// Cloudinary signature for direct upload (client-side)
export async function getImageUploadSignature(listingId: string, requesterId: string, role: string) {
  const listing = await repo.findListingById(listingId)
  if (!listing) throw { statusCode: 404, message: 'Listing not found' }
  if (role !== 'admin' && listing.agent_id !== requesterId && listing.seller_id !== requesterId) {
    throw { statusCode: 403, message: 'Not authorized' }
  }

  const { v2: cloudinary } = await import('cloudinary')
  const timestamp = Math.round(Date.now() / 1000)
  const folder = `listings/${listingId}`
  const paramsToSign = { timestamp, folder, overwrite: false }
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  )
  return {
    signature,
    timestamp,
    folder,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
  }
}

export async function confirmImageUpload(
  listingId: string,
  data: { cloudinaryPublicId: string; url: string; width: number; height: number },
  requesterId: string,
  role: string
) {
  const listing = await repo.findListingById(listingId)
  if (!listing) throw { statusCode: 404, message: 'Listing not found' }
  if (role !== 'admin' && listing.agent_id !== requesterId && listing.seller_id !== requesterId) {
    throw { statusCode: 403, message: 'Not authorized' }
  }

  const imageCount = await repo.getListingImageCount(listingId)
  const isPrimary = imageCount === 0

  const image = await repo.createListingImage({
    listingId,
    cloudinaryPublicId: data.cloudinaryPublicId,
    url: data.url,
    width: data.width,
    height: data.height,
    sortOrder: imageCount,
    isPrimary,
  })

  if (isPrimary) {
    await repo.setPrimaryImage(listingId, image.id)
  }

  // Sync to ES after image added
  await listingSyncQueue.add('upsert-listing', { listingId }, { jobId: `listing:${listingId}:sync` })

  return image
}
