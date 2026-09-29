import { query } from '../../config/db.js'

export interface DbUser {
  id: string
  email: string
  password_hash: string | null
  role: string
  first_name: string
  last_name: string
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  oauth_provider: string | null
  oauth_id: string | null
  created_at: string
  updated_at: string
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const { rows } = await query<DbUser>(
    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
    [email]
  )
  return rows[0] ?? null
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const { rows } = await query<DbUser>(
    `SELECT * FROM users WHERE id = $1 LIMIT 1`,
    [id]
  )
  return rows[0] ?? null
}

export async function findUserByOAuth(provider: string, oauthId: string): Promise<DbUser | null> {
  const { rows } = await query<DbUser>(
    `SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2 LIMIT 1`,
    [provider, oauthId]
  )
  return rows[0] ?? null
}

export async function createUser(data: {
  email: string
  passwordHash: string | null
  role: string
  firstName: string
  lastName: string
  phone?: string
  oauthProvider?: string
  oauthId?: string
}): Promise<DbUser> {
  const { rows } = await query<DbUser>(
    `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, oauth_provider, oauth_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.email,
      data.passwordHash,
      data.role,
      data.firstName,
      data.lastName,
      data.phone ?? null,
      data.oauthProvider ?? null,
      data.oauthId ?? null,
    ]
  )
  return rows[0]
}

export async function createAgent(data: {
  userId: string
  licenseNumber: string
  agencyName: string
}): Promise<void> {
  await query(
    `INSERT INTO agents (user_id, license_number, agency_name) VALUES ($1, $2, $3)`,
    [data.userId, data.licenseNumber, data.agencyName]
  )
}

export function formatUser(user: DbUser) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    isActive: user.is_active,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  }
}
