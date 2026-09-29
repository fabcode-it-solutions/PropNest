import { Resend } from 'resend'
import { env } from '../../config/env.js'

const resend = new Resend(env.RESEND_API_KEY)
const FROM = env.EMAIL_FROM

export interface EmailPayload {
  to: string
  subject: string
  html: string
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  })
}

// Email templates
export const templates = {
  offerReceived: (data: { agentName: string; address: string; price: number; buyerName: string }) => ({
    subject: `New Offer on ${data.address}`,
    html: `<p>Hi ${data.agentName},</p>
<p><strong>${data.buyerName}</strong> has submitted an offer of <strong>$${data.price.toLocaleString()}</strong> on <strong>${data.address}</strong>.</p>
<p><a href="${env.APP_URL}/listings">View in PropNest →</a></p>`,
  }),

  offerCountered: (data: { buyerName: string; address: string; counterPrice: number }) => ({
    subject: `Counter Offer on ${data.address}`,
    html: `<p>Hi ${data.buyerName},</p>
<p>The seller has countered your offer on <strong>${data.address}</strong> at <strong>$${data.counterPrice.toLocaleString()}</strong>.</p>
<p><a href="${env.APP_URL}/dashboard">Review in PropNest →</a></p>`,
  }),

  offerAccepted: (data: { buyerName: string; address: string; price: number }) => ({
    subject: `Your Offer Was Accepted! 🎉`,
    html: `<p>Congratulations ${data.buyerName}!</p>
<p>Your offer of <strong>$${data.price.toLocaleString()}</strong> on <strong>${data.address}</strong> has been accepted. A transaction has been opened.</p>
<p><a href="${env.APP_URL}/dashboard">Go to PropNest →</a></p>`,
  }),

  showingConfirmed: (data: { buyerName: string; address: string; scheduledAt: string }) => ({
    subject: `Showing Confirmed — ${data.address}`,
    html: `<p>Hi ${data.buyerName},</p>
<p>Your showing at <strong>${data.address}</strong> has been confirmed for <strong>${new Date(data.scheduledAt).toLocaleString()}</strong>.</p>
<p><a href="${env.APP_URL}/dashboard">View in PropNest →</a></p>`,
  }),

  showingReminder: (data: { name: string; address: string; scheduledAt: string; windowHours: number }) => ({
    subject: `Reminder: Showing in ${data.windowHours} hour${data.windowHours > 1 ? 's' : ''}`,
    html: `<p>Hi ${data.name},</p>
<p>You have a showing at <strong>${data.address}</strong> in ${data.windowHours} hour${data.windowHours > 1 ? 's' : ''} — <strong>${new Date(data.scheduledAt).toLocaleString()}</strong>.</p>`,
  }),

  mortgageStageChanged: (data: { buyerName: string; newStage: string; applicationId: string }) => ({
    subject: `Mortgage Update: ${data.newStage.replace(/_/g, ' ')}`,
    html: `<p>Hi ${data.buyerName},</p>
<p>Your mortgage application has been advanced to <strong>${data.newStage.replace(/_/g, ' ')}</strong>.</p>
<p><a href="${env.APP_URL}/mortgage/${data.applicationId}">View details →</a></p>`,
  }),

  savedSearchMatch: (data: { buyerName: string; searchName: string; listingCount: number }) => ({
    subject: `${data.listingCount} new listing${data.listingCount > 1 ? 's' : ''} match your saved search "${data.searchName}"`,
    html: `<p>Hi ${data.buyerName},</p>
<p>We found <strong>${data.listingCount} new listing${data.listingCount > 1 ? 's' : ''}</strong> matching your saved search "<strong>${data.searchName}</strong>".</p>
<p><a href="${env.APP_URL}/search">Search listings →</a></p>`,
  }),
}
