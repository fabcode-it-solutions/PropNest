import { buildApp } from './app.js'
import { env } from './config/env.js'
import { startWorkers, stopWorkers } from './jobs/worker-registry.js'

const app = buildApp()

async function start() {
  try {
    await app.listen({ port: env.PORT, host: env.HOST })
    app.log.info(`PropNest API running on ${env.HOST}:${env.PORT}`)

    await startWorkers()
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

async function shutdown() {
  await stopWorkers()
  await app.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

start()
