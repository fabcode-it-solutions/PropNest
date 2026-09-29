import { query } from '../../config/db.js'

export interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  read_at: string | null
  payload: Record<string, unknown>
  email_sent_at: string | null
  created_at: string
}

export async function createNotification(data: {
  userId: string
  type: string
  title: string
  body: string
  payload?: Record<string, unknown>
}): Promise<NotificationRow> {
  const res = await query<NotificationRow>(
    `INSERT INTO notifications (user_id, type, title, body, payload)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.userId, data.type, data.title, data.body, JSON.stringify(data.payload ?? {})]
  )
  return res.rows[0]
}

export async function getUserNotifications(
  userId: string,
  unreadOnly: boolean,
  limit: number,
  offset: number
): Promise<{ notifications: NotificationRow[]; total: number }> {
  const where = unreadOnly
    ? `WHERE user_id = $1 AND read_at IS NULL`
    : `WHERE user_id = $1`

  const [rows, count] = await Promise.all([
    query<NotificationRow>(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    query<{ count: string }>(`SELECT COUNT(*)::int as count FROM notifications ${where}`, [userId]),
  ])

  return { notifications: rows.rows, total: count.rows[0].count as unknown as number }
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  await query(
    `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
    [id, userId]
  )
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await query(
    `UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  )
}

export async function markEmailSent(id: string): Promise<void> {
  await query(`UPDATE notifications SET email_sent_at = NOW() WHERE id = $1`, [id])
}
