import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { env } from '../../config/env.js'

export interface JwtPayload {
  userId: string
  role: string
  jti?: string
}

// Augment @fastify/jwt's VerifyPayloadType so request.user is typed
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

export const jwtPlugin = fp(async (app: FastifyInstance) => {
  app.register(fastifyJwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: { expiresIn: '15m' },
  })

  app.decorate('authenticate', async (request: FastifyRequest) => {
    await request.jwtVerify()
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>
  }
}
