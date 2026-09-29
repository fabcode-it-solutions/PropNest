import { query } from '../../config/db.js'

export async function createApplication(data: {
  buyerId: string; loanType: string; loanAmount: number; propertyValue: number
  creditScore?: number; annualIncome?: number; monthlyIncome?: number; monthlyDebt?: number
}) {
  const { rows } = await query(
    `INSERT INTO mortgage_applications
       (buyer_id, loan_type, loan_amount, property_value, credit_score, annual_income, monthly_income, monthly_debt)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.buyerId, data.loanType, data.loanAmount, data.propertyValue,
     data.creditScore ?? null, data.annualIncome ?? null, data.monthlyIncome ?? null, data.monthlyDebt ?? null]
  )
  return rows[0]
}

export async function findApplicationById(id: string) {
  const { rows } = await query(
    `SELECT a.*,
       json_build_object('id', b.id, 'firstName', b.first_name, 'lastName', b.last_name, 'email', b.email) AS buyer,
       CASE WHEN l.id IS NOT NULL THEN json_build_object('id', l.id, 'firstName', l.first_name, 'lastName', l.last_name) ELSE NULL END AS lender
     FROM mortgage_applications a
     JOIN users b ON b.id = a.buyer_id
     LEFT JOIN users l ON l.id = a.lender_id
     WHERE a.id = $1`,
    [id]
  )
  return rows[0] ?? null
}

export async function listApplications(userId: string, role: string) {
  const col = role === 'buyer' ? 'a.buyer_id' : role === 'lender' ? 'a.lender_id' : null
  const where = col ? `WHERE ${col} = $1` : ''
  const values = col ? [userId] : []
  const { rows } = await query(
    `SELECT a.*, u.first_name, u.last_name, u.email
     FROM mortgage_applications a JOIN users u ON u.id = a.buyer_id
     ${where} ORDER BY a.created_at DESC`,
    values
  )
  return rows
}

export async function updateApplicationStage(id: string, stage: string, extra?: {
  lenderId?: string; denialReason?: string
}) {
  const sets = ['stage = $1']
  const vals: unknown[] = [stage]
  let idx = 2
  if (extra?.lenderId)     { sets.push(`lender_id = $${idx++}`);     vals.push(extra.lenderId) }
  if (extra?.denialReason) { sets.push(`denial_reason = $${idx++}`); vals.push(extra.denialReason) }
  vals.push(id)
  const { rows } = await query(
    `UPDATE mortgage_applications SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals
  )
  return rows[0]
}

export async function getMortgageDocumentsForApp(applicationId: string) {
  const { rows } = await query(
    `SELECT * FROM mortgage_documents WHERE application_id = $1 ORDER BY uploaded_at DESC`,
    [applicationId]
  )
  return rows
}

export async function checkAllDocsVerified(applicationId: string): Promise<boolean> {
  const { rows } = await query<{ count: string }>(
    `SELECT count(*) FROM mortgage_documents
     WHERE application_id = $1 AND (extraction_status != 'completed' OR reviewed = false)`,
    [applicationId]
  )
  return parseInt(rows[0]?.count ?? '1') === 0
}

export async function checkHasOpenConditions(applicationId: string): Promise<boolean> {
  const { rows } = await query<{ count: string }>(
    `SELECT count(*) FROM mortgage_conditions WHERE application_id = $1 AND status = 'open'`,
    [applicationId]
  )
  return parseInt(rows[0]?.count ?? '0') > 0
}

export async function createMortgageDocument(data: {
  applicationId: string; uploaderId: string; docType: string
  s3Key: string; filename: string; sizeBytes: number
}) {
  const { rows } = await query(
    `INSERT INTO mortgage_documents (application_id, uploader_id, doc_type, s3_key, filename, size_bytes)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.applicationId, data.uploaderId, data.docType, data.s3Key, data.filename, data.sizeBytes]
  )
  return rows[0]
}

export async function updateDocumentOCR(id: string, data: {
  textractJobId?: string; extractionStatus: string
  extractedData?: unknown; confidenceScores?: unknown
}) {
  const { rows } = await query(
    `UPDATE mortgage_documents
     SET textract_job_id = COALESCE($1, textract_job_id),
         extraction_status = $2,
         extracted_data = COALESCE($3::jsonb, extracted_data),
         confidence_scores = COALESCE($4::jsonb, confidence_scores)
     WHERE id = $5 RETURNING *`,
    [
      data.textractJobId ?? null, data.extractionStatus,
      data.extractedData ? JSON.stringify(data.extractedData) : null,
      data.confidenceScores ? JSON.stringify(data.confidenceScores) : null,
      id,
    ]
  )
  return rows[0]
}

export async function saveReviewerCorrections(id: string, corrections: unknown, reviewerId: string) {
  const { rows } = await query(
    `UPDATE mortgage_documents
     SET reviewer_corrections = $1::jsonb, reviewed = true, reviewer_id = $2
     WHERE id = $3 RETURNING *`,
    [JSON.stringify(corrections), reviewerId, id]
  )
  return rows[0]
}

// Conditions
export async function createCondition(data: {
  applicationId: string; description: string; createdBy: string
}) {
  const { rows } = await query(
    `INSERT INTO mortgage_conditions (application_id, description, created_by)
     VALUES ($1,$2,$3) RETURNING *`,
    [data.applicationId, data.description, data.createdBy]
  )
  return rows[0]
}

export async function updateCondition(id: string, status: string, resolvedBy: string) {
  const { rows } = await query(
    `UPDATE mortgage_conditions
     SET status = $1, resolved_by = $2, resolved_at = now()
     WHERE id = $3 RETURNING *`,
    [status, resolvedBy, id]
  )
  return rows[0]
}

export async function getConditions(applicationId: string) {
  const { rows } = await query(
    `SELECT * FROM mortgage_conditions WHERE application_id = $1 ORDER BY created_at`,
    [applicationId]
  )
  return rows
}
