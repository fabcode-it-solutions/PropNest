import { query } from '../../config/db.js'

export async function findTransactionById(id: string) {
  const { rows } = await query(
    `SELECT t.*,
       l.address_line1, l.city, l.slug, l.primary_image_url,
       json_build_object('id', b.id, 'firstName', b.first_name, 'lastName', b.last_name, 'email', b.email) AS buyer,
       json_build_object('id', s.id, 'firstName', s.first_name, 'lastName', s.last_name, 'email', s.email) AS seller,
       json_build_object('id', a.id, 'firstName', a.first_name, 'lastName', a.last_name, 'email', a.email) AS agent
     FROM transactions t
     JOIN listings l ON l.id = t.listing_id
     JOIN users b ON b.id = t.buyer_id
     JOIN users s ON s.id = t.seller_id
     JOIN users a ON a.id = t.agent_id
     WHERE t.id = $1`,
    [id]
  )
  return rows[0] ?? null
}

export async function listTransactionsForUser(userId: string, role: string) {
  const col = role === 'buyer' ? 't.buyer_id' : role === 'seller' ? 't.seller_id' : 't.agent_id'
  const { rows } = await query(
    `SELECT t.*, l.address_line1, l.city, l.slug, l.primary_image_url
     FROM transactions t JOIN listings l ON l.id = t.listing_id
     WHERE ${col} = $1 ORDER BY t.created_at DESC`,
    [userId]
  )
  return rows
}

export async function isTransactionParty(transactionId: string, userId: string) {
  const { rows } = await query<{ count: string }>(
    `SELECT count(*) FROM transactions
     WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2 OR agent_id = $2)`,
    [transactionId, userId]
  )
  return parseInt(rows[0]?.count ?? '0') > 0
}

// Documents
export async function createTransactionDocument(data: {
  transactionId: string; uploaderId: string; category: string
  s3Key: string; filename: string; sizeBytes: number; mimeType: string
}) {
  const { rows } = await query(
    `INSERT INTO transaction_documents
       (transaction_id, uploader_id, category, s3_key, filename, size_bytes, mime_type)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.transactionId, data.uploaderId, data.category, data.s3Key, data.filename, data.sizeBytes, data.mimeType]
  )
  return rows[0]
}

export async function listTransactionDocuments(transactionId: string) {
  const { rows } = await query(
    `SELECT d.*, u.first_name, u.last_name
     FROM transaction_documents d JOIN users u ON u.id = d.uploader_id
     WHERE d.transaction_id = $1 AND d.is_current_version = true
     ORDER BY d.uploaded_at DESC`,
    [transactionId]
  )
  return rows
}

export async function findTransactionDocument(id: string) {
  const { rows } = await query(`SELECT * FROM transaction_documents WHERE id = $1`, [id])
  return rows[0] ?? null
}

export async function incrementDownloadCount(id: string) {
  await query(`UPDATE transaction_documents SET download_count = download_count + 1 WHERE id = $1`, [id])
}
