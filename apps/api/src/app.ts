import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import oauth2 from '@fastify/oauth2'
import { env } from './config/env.js'
import { jwtPlugin } from './shared/auth/jwt.plugin.js'
import { socketPlugin } from './shared/websockets/socket.plugin.js'
import { authRoutes } from './modules/auth/routes.js'
import { listingsRoutes } from './modules/listings/routes.js'
import { showingsRoutes } from './modules/showings/routes.js'
import { searchRoutes } from './modules/search/routes.js'
import { offersRoutes } from './modules/offers/routes.js'
import { transactionsRoutes } from './modules/transactions/routes.js'
import { mortgageRoutes } from './modules/mortgage/routes.js'
import { notificationRoutes } from './modules/notifications/routes.js'
import { savedSearchRoutes } from './modules/listings/saved-searches/routes.js'
import { adminRoutes } from './modules/admin/routes.js'
import { agentsRoutes } from './modules/agents/routes.js'
import { crmRoutes } from './modules/crm/routes.js'
import { registerNotificationListeners } from './modules/notifications/listeners/index.js'

export function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  })

  // ── Security ──────────────────────────────────────────────────────────────
  app.register(helmet, { global: true })
  app.register(cors, {
    origin: [env.APP_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  })

  // ── JWT ───────────────────────────────────────────────────────────────────
  app.register(jwtPlugin)

  // ── Google OAuth2 ─────────────────────────────────────────────────────────
  app.register(oauth2, {
    name: 'googleOAuth2',
    scope: ['profile', 'email'],
    credentials: {
      client: { id: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET },
      auth: (oauth2 as any).GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/auth/google',
    callbackUri: env.GOOGLE_CALLBACK_URL,
  })

  // ── WebSockets ────────────────────────────────────────────────────────────
  app.register(socketPlugin)

  // ── Error handler ─────────────────────────────────────────────────────────
  app.setErrorHandler((error, _req, reply) => {
    const statusCode = (error as any).statusCode ?? 500
    app.log.error(error)
    return reply.status(statusCode).send({
      statusCode,
      error: statusCode >= 500 ? 'Internal Server Error' : 'Error',
      message: error.message ?? 'Internal Server Error',
    })
  })

  // ── Health + root ─────────────────────────────────────────────────────────
  app.get('/healthz', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  app.get('/', async () => ({ name: 'PropNest API', version: '0.1.0' }))

  // ── Modules ───────────────────────────────────────────────────────────────
  app.register(authRoutes)
  app.register(listingsRoutes)
  app.register(showingsRoutes)
  app.register(searchRoutes)
  app.register(offersRoutes)
  app.register(transactionsRoutes)
  app.register(mortgageRoutes)
  app.register(notificationRoutes)
  app.register(savedSearchRoutes)
  app.register(adminRoutes)
  app.register(agentsRoutes)
  app.register(crmRoutes)

  // ── Domain event listeners ────────────────────────────────────────────────
  registerNotificationListeners()

  return app
}
