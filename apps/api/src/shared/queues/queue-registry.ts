import { Queue } from 'bullmq'
import { redis } from '../../config/redis.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const connection = redis as any

const defaultJobOptions = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
}

export const listingSyncQueue = new Queue('listing-sync', {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
  },
})

export const ocrQueue = new Queue('ocr-processing', {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 3,
    backoff: { type: 'fixed', delay: 30000 },
  },
})

export const notificationsQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
  },
})

export const scheduledQueue = new Queue('scheduled', {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
  },
})

export const pdfQueue = new Queue('pdf-generation', {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 3,
    backoff: { type: 'fixed', delay: 15000 },
  },
})
