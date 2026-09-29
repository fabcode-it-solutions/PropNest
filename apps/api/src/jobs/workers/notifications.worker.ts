import { Worker } from 'bullmq'
import { redis } from '../../config/redis.js'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const connection = redis as any
import { sendEmail, templates } from '../../modules/notifications/email.service.js'
import { markEmailSent } from '../../modules/notifications/repo.js'
import { emitToUser, emitToRoom } from '../../shared/websockets/io.js'

type SendEmailJob = {
  to: string
  template: keyof typeof templates
  data: Record<string, unknown>
  notificationId?: string
}

type SendRealtimeJob = {
  room: string
  event: string
  data: unknown
}

export const notificationsWorker = new Worker(
  'notifications',
  async (job) => {
    if (job.name === 'send-email') {
      const { to, template, data, notificationId } = job.data as SendEmailJob
      const templateFn = templates[template]
      if (!templateFn) throw new Error(`Unknown email template: ${template}`)

      const { subject, html } = (templateFn as (d: Record<string, unknown>) => { subject: string; html: string })(data)
      await sendEmail({ to, subject, html })

      if (notificationId) {
        await markEmailSent(notificationId)
      }
    }

    if (job.name === 'send-realtime') {
      const { room, event, data } = job.data as SendRealtimeJob
      emitToRoom(room, event, data)
    }
  },
  {
    connection,
    concurrency: 4,
  }
)

notificationsWorker.on('failed', (job, err) => {
  console.error(`[notifications-worker] Job ${job?.id} failed:`, err.message)
})
