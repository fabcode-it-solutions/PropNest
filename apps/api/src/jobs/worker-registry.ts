import { listingSyncWorker } from './workers/listing-sync.worker.js'
import { ocrWorker } from './workers/ocr.worker.js'
import { scheduledWorker, registerRepeatableJobs } from './workers/scheduled.worker.js'
import { notificationsWorker } from './workers/notifications.worker.js'
import { pdfWorker } from './workers/pdf.worker.js'

export async function startWorkers(): Promise<void> {
  // Workers are already running once imported; just log their status
  console.log('[workers] listing-sync worker started')
  console.log('[workers] ocr-processing worker started')
  console.log('[workers] scheduled worker started')
  console.log('[workers] notifications worker started')
  console.log('[workers] pdf-generation worker started')

  await registerRepeatableJobs()
  console.log('[workers] repeatable jobs registered (offer-expiry, saved-search-match)')
}

export function getWorkers() {
  return [listingSyncWorker, ocrWorker, scheduledWorker, notificationsWorker, pdfWorker]
}

export async function stopWorkers(): Promise<void> {
  await Promise.all(getWorkers().map((w) => w.close()))
  console.log('[workers] all workers stopped')
}
