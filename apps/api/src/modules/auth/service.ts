import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import * as repo from './repo.js'
import { issueTokens } from '../../shared/auth/refresh.service.js'
import type { RegisterInput, LoginInput } from './schema.js'

export async function register(app: FastifyInstance, input: RegisterInput, ipAddress?: string) {
  const existing = await repo.findUserByEmail(input.email)
  if (existing) {
    throw { statusCode: 409, message: 'Email already registered' }
  }

  if (input.role === 'agent' && (!input.licenseNumber || !input.agencyName)) {
    throw { statusCode: 400, message: 'Agent registration requires licenseNumber and agencyName' }
  }

  const passwordHash = await bcrypt.hash(input.password, 10)
  const user = await repo.createUser({
    email: input.email,
    passwordHash,
    role: input.role,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
  })

  if (input.role === 'agent') {
    await repo.createAgent({
      userId: user.id,
      licenseNumber: input.licenseNumber!,
      agencyName: input.agencyName!,
    })
  }

  const tokens = await issueTokens(app, user.id, user.role, ipAddress)
  return { ...tokens, user: repo.formatUser(user) }
}

export async function login(app: FastifyInstance, input: LoginInput, ipAddress?: string) {
  const user = await repo.findUserByEmail(input.email)
  if (!user || !user.password_hash) {
    throw { statusCode: 401, message: 'Invalid email or password' }
  }
  if (!user.is_active) {
    throw { statusCode: 403, message: 'Account deactivated' }
  }

  const valid = await bcrypt.compare(input.password, user.password_hash)
  if (!valid) {
    throw { statusCode: 401, message: 'Invalid email or password' }
  }

  const tokens = await issueTokens(app, user.id, user.role, ipAddress)
  return { ...tokens, user: repo.formatUser(user) }
}

export async function upsertOAuthUser(
  app: FastifyInstance,
  profile: { id: string; email: string; firstName: string; lastName: string; avatarUrl?: string },
  ipAddress?: string
) {
  // Check if user exists by OAuth ID
  let user = await repo.findUserByOAuth('google', profile.id)

  if (!user) {
    // Check by email (may have registered with password)
    user = await repo.findUserByEmail(profile.email)
    if (user) {
      // Link OAuth to existing account
      const { query } = await import('../../config/db.js')
      await query(
        `UPDATE users SET oauth_provider = 'google', oauth_id = $1, avatar_url = COALESCE(avatar_url, $2) WHERE id = $3`,
        [profile.id, profile.avatarUrl ?? null, user.id]
      )
    } else {
      // Create new buyer account
      user = await repo.createUser({
        email: profile.email,
        passwordHash: null,
        role: 'buyer',
        firstName: profile.firstName,
        lastName: profile.lastName,
        oauthProvider: 'google',
        oauthId: profile.id,
      })
    }
  }

  if (!user.is_active) {
    throw { statusCode: 403, message: 'Account deactivated' }
  }

  const tokens = await issueTokens(app, user.id, user.role, ipAddress)
  return { ...tokens, user: repo.formatUser(user) }
}
