import fp from 'fastify-plugin'
import { Server } from 'socket.io'
import type { FastifyInstance } from 'fastify'
import type { JwtPayload } from '../auth/jwt.plugin.js'
import { setIo } from './io.js'

declare module 'fastify' {
  interface FastifyInstance {
    io: Server
  }
}

export const socketPlugin = fp(async (app: FastifyInstance) => {
  const io = new Server(app.server, {
    cors: { origin: process.env.APP_URL ?? 'http://localhost:3001', credentials: true },
    transports: ['websocket', 'polling'],
  })

  // Export io singleton for use in notification listeners / workers
  setIo(io)

  // JWT auth middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token as string
      if (!token) return next(new Error('Authentication required'))
      const payload = app.jwt.verify<JwtPayload>(token)
      socket.data.userId = payload.userId
      socket.data.role = payload.role
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string
    const role = socket.data.role as string

    // Auto-join personal room
    socket.join(`user:${userId}`)

    if (role === 'agent') socket.join(`agent-crm:${userId}`)

    socket.on('join-transaction', (transactionId: string) => {
      socket.join(`transaction:${transactionId}`)
    })

    socket.on('join-mortgage', (applicationId: string) => {
      socket.join(`mortgage:${applicationId}`)
    })

    socket.on('disconnect', () => {
      socket.leave(`user:${userId}`)
    })
  })

  app.decorate('io', io)
})
