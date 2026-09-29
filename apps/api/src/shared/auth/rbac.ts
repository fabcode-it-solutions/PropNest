import type { FastifyRequest, FastifyReply } from 'fastify'
import type { UserRole } from '@propnest/shared-types'
import type { JwtPayload } from './jwt.plugin.js'

/**
 * Factory that returns a Fastify preHandler enforcing role-based access.
 * Usage: { preHandler: [app.authenticate, requireRole('agent', 'admin')] }
 */
export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as JwtPayload
    if (!user || !roles.includes(user.role as UserRole)) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Required role: ${roles.join(' | ')}`,
      })
    }
  }
}

export const requireAuth = requireRole('buyer', 'seller', 'agent', 'lender', 'admin')
