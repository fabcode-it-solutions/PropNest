import { Redis } from 'ioredis'
import { env } from './env.js'

// Upstash Redis via standard Redis protocol (TLS)
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required for BullMQ
  enableReadyCheck: false,
  tls: env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
})

redis.on('error', (err) => {
  console.error('Redis error:', err)
})
