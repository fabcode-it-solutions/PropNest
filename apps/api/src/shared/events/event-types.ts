export type DomainEvent =
  | { type: 'listing.published';        payload: { listingId: string; agentId: string } }
  | { type: 'listing.status_changed';   payload: { listingId: string; oldStatus: string; newStatus: string } }
  | { type: 'offer.received';           payload: { offerId: string; listingId: string; buyerId: string; agentId: string; price: number } }
  | { type: 'offer.countered';          payload: { offerId: string; parentOfferId: string; listingId: string; buyerId: string; price: number } }
  | { type: 'offer.accepted';           payload: { offerId: string; listingId: string; buyerId: string; transactionId: string } }
  | { type: 'offer.rejected';           payload: { offerId: string; listingId: string; buyerId: string } }
  | { type: 'offer.expired';            payload: { offerId: string; listingId: string; buyerId: string } }
  | { type: 'showing.requested';        payload: { showingId: string; listingId: string; buyerId: string; agentId: string; scheduledAt: string } }
  | { type: 'showing.confirmed';        payload: { showingId: string; listingId: string; buyerId: string; agentId: string; scheduledAt: string } }
  | { type: 'showing.cancelled';        payload: { showingId: string; listingId: string; buyerId: string; agentId: string; cancelledBy: string } }
  | { type: 'showing.reminder';         payload: { showingId: string; listingId: string; buyerId: string; agentId: string; scheduledAt: string; windowHours: 24 | 1 } }
  | { type: 'transaction.created';      payload: { transactionId: string; listingId: string; buyerId: string; sellerId: string; agentId: string } }
  | { type: 'document.uploaded';        payload: { documentId: string; transactionId?: string; applicationId?: string; uploaderId: string; docType: string } }
  | { type: 'mortgage.stage_changed';   payload: { applicationId: string; buyerId: string; lenderId: string | null; oldStage: string; newStage: string } }
  | { type: 'mortgage.final_approved';  payload: { applicationId: string; buyerId: string; lenderId: string } }
  | { type: 'ocr.completed';            payload: { documentId: string; applicationId: string; lenderId: string | null } }
  | { type: 'ocr.failed';               payload: { documentId: string; applicationId: string; buyerId: string; reason: string } }
  | { type: 'saved_search.matched';     payload: { savedSearchId: string; buyerId: string; listingIds: string[] } }
