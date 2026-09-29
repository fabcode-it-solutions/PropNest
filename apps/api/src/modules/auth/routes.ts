import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { OAuth2Namespace } from '@fastify/oauth2'
import { registerSchema, loginSchema, refreshSchema } from './schema.js'
import * as service from './service.js'
import { rotateRefreshToken, revokeRefreshToken } from '../../shared/auth/refresh.service.js'
import * as repo from './repo.js'
import { env } from '../../config/env.js'
import type { JwtPayload } from '../../shared/auth/jwt.plugin.js'

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace
  }
}

export const authRoutes = fp(async (app: FastifyInstance) => {
  // POST /auth/register
  app.post('/auth/register', async (req, reply) => {
    const input = registerSchema.parse(req.body)
    const result = await service.register(app, input, req.ip)
    return reply.status(201).send(result)
  })

  // POST /auth/login
  app.post('/auth/login', async (req, reply) => {
    const input = loginSchema.parse(req.body)
    const result = await service.login(app, input, req.ip)
    return reply.send(result)
  })

  // POST /auth/refresh
  app.post('/auth/refresh', async (req, reply) => {
    const { refreshToken } = refreshSchema.parse(req.body)
    const result = await rotateRefreshToken(app, refreshToken, req.ip)
    return reply.send(result)
  })

  // POST /auth/logout
  app.post('/auth/logout', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = req.body as { sessionId?: string }
    if (body?.sessionId) {
      await revokeRefreshToken(body.sessionId, 'logout')
    }
    return reply.status(204).send()
  })

  // GET /auth/me
  app.get('/auth/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { userId } = req.user as JwtPayload
    const user = await repo.findUserById(userId)
    if (!user) return reply.status(404).send({ message: 'User not found' })
    return reply.send(repo.formatUser(user))
  })

  // GET /auth/google → handled by @fastify/oauth2 startRedirectPath, but we keep a manual route
  // to handle the callback explicitly.

  // GET /auth/google/callback
  app.get('/auth/google/callback', async (req, reply) => {
    const { token } = await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req, reply)

    // Fetch Google profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })
    const profile = (await profileRes.json()) as {
      id: string
      email: string
      given_name: string
      family_name: string
      picture?: string
    }

    const result = await service.upsertOAuthUser(
      app,
      {
        id: profile.id,
        email: profile.email,
        firstName: profile.given_name,
        lastName: profile.family_name,
        avatarUrl: profile.picture,
      },
      req.ip
    )

    const redirectUrl = new URL('/callback', env.APP_URL)
    redirectUrl.searchParams.set('accessToken', result.accessToken)
    redirectUrl.searchParams.set('refreshToken', result.refreshToken)
    redirectUrl.searchParams.set('sessionId', result.sessionId)
    return reply.redirect(redirectUrl.toString())
  })
})
