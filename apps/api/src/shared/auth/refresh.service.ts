import crypto from 'node:crypto'
import { redis } from '../../config/redis.js'
import { query } from '../../config/db.js'
import type { FastifyInstance } from 'fastify'

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days
const REDIS_KEY = (sessionId: string) => `session:${sessionId}`

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  sessionId: string
}

export async function issueTokens(
  app: FastifyInstance,
  userId: string,
  role: string,
  ipAddress?: string
): Promise<TokenPair> {
  const rawToken = generateRawToken()
  const tokenHash = hashToken(rawToken)
  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000)

  // Store hash in Postgres
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, session_id, expires_at, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, sessionId, expiresAt.toISOString(), ipAddress ?? null]
  )

  // Store session in Redis for fast lookup
  await redis.setex(REDIS_KEY(sessionId), REFRESH_TTL_SECONDS, userId)

  const accessToken = app.jwt.sign(
    { userId, role },
    { expiresIn: '15m' }
  )

  return { accessToken, refreshToken: rawToken, sessionId }
}

export async function rotateRefreshToken(
  app: FastifyInstance,
  rawToken: string,
  ipAddress?: string
): Promise<TokenPair> {
  const tokenHash = hashToken(rawToken)

  // Look up token in DB
  const { rows } = await query<{
    id: string
    user_id: string
    session_id: string
    expires_at: string
    revoked_at: string | null
  }>(
    `SELECT id, user_id, session_id, expires_at, revoked_at
     FROM refresh_tokens
     WHERE token_hash = $1`,
    [tokenHash]
  )

  const existing = rows[0]
  if (!existing) throw { statusCode: 401, message: 'Invalid refresh token' }
  if (existing.revoked_at) throw { statusCode: 401, message: 'Refresh token revoked' }
  if (new Date(existing.expires_at) < new Date()) throw { statusCode: 401, message: 'Refresh token expired' }

  // Verify session still in Redis (belt & suspenders)
  const redisUserId = await redis.get(REDIS_KEY(existing.session_id))
  if (!redisUserId) throw { statusCode: 401, message: 'Session expired' }

  // Get user role
  const { rows: userRows } = await query<{ role: string }>(
    `SELECT role FROM users WHERE id = $1 AND is_active = true`,
    [existing.user_id]
  )
  if (!userRows[0]) throw { statusCode: 401, message: 'User not found or inactive' }

  // Revoke old token
  await Promise.all([
    query(
      `UPDATE refresh_tokens SET revoked_at = now(), revocation_reason = 'rotated' WHERE id = $1`,
      [existing.id]
    ),
    redis.del(REDIS_KEY(existing.session_id)),
  ])

  // Issue new pair
  return issueTokens(app, existing.user_id, userRows[0].role, ipAddress)
}

export async function revokeRefreshToken(sessionId: string, reason = 'logout'): Promise<void> {
  await Promise.all([
    query(
      `UPDATE refresh_tokens SET revoked_at = now(), revocation_reason = $1 WHERE session_id = $2`,
      [reason, sessionId]
    ),
    redis.del(REDIS_KEY(sessionId)),
  ])
}
