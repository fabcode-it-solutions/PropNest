import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireRole } from '../../shared/auth/rbac.js'
import * as repo from './repo.js'
import { getPresignedUploadUrl, getPresignedDownloadUrl, verifyS3Upload, buildS3Key } from '../../shared/storage/presigned.service.js'
import { emitter } from '../../shared/events/emitter.js'
import { query } from '../../config/db.js'
import type { JwtPayload } from '../../shared/auth/jwt.plugin.js'

const presignedSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  category: z.enum(['purchase_agreement', 'inspection_report', 'appraisal', 'title_report', 'disclosure', 'other']),
})

export const transactionsRoutes = fp(async (app: FastifyInstance) => {
  // GET /transactions
  app.get('/transactions', {
    preHandler: [app.authenticate, requireRole('buyer', 'seller', 'agent', 'admin')],
  }, async (req, reply) => {
    const { userId, role } = req.user as JwtPayload
    return reply.send(await repo.listTransactionsForUser(userId, role))
  })

  // GET /transactions/:id
  app.get('/transactions/:id', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId, role } = req.user as JwtPayload
    const transaction = await repo.findTransactionById(id)
    if (!transaction) return reply.status(404).send({ message: 'Not found' })
    if (role !== 'admin' && !(await repo.isTransactionParty(id, userId))) {
      return reply.status(403).send({ message: 'Forbidden' })
    }
    return reply.send(transaction)
  })

  // PATCH /transactions/:id — agent/admin update status or closing date
  app.patch('/transactions/:id', {
    preHandler: [app.authenticate, requireRole('agent', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status, closingDate, escrowCompany } = req.body as {
      status?: string; closingDate?: string; escrowCompany?: string
    }
    const setClauses: string[] = []
    const values: unknown[] = []
    let idx = 1
    if (status)       { setClauses.push(`status = $${idx++}`);       values.push(status) }
    if (closingDate)  { setClauses.push(`closing_date = $${idx++}`); values.push(closingDate) }
    if (escrowCompany){ setClauses.push(`escrow_company = $${idx++}`); values.push(escrowCompany) }
    if (setClauses.length === 0) return reply.status(400).send({ message: 'Nothing to update' })
    values.push(id)
    const { rows } = await query(
      `UPDATE transactions SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    )
    return reply.send(rows[0])
  })

  // GET /transactions/:id/documents
  app.get('/transactions/:id/documents', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId, role } = req.user as JwtPayload
    if (role !== 'admin' && !(await repo.isTransactionParty(id, userId))) {
      return reply.status(403).send({ message: 'Forbidden' })
    }
    return reply.send(await repo.listTransactionDocuments(id))
  })

  // POST /transactions/:id/documents/presigned
  app.post('/transactions/:id/documents/presigned', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId, role } = req.user as JwtPayload
    if (role !== 'admin' && !(await repo.isTransactionParty(id, userId))) {
      return reply.status(403).send({ message: 'Forbidden' })
    }
    const { filename, mimeType, category } = presignedSchema.parse(req.body)
    const s3Key = buildS3Key(`transactions/${id}`, category, filename)
    const uploadUrl = await getPresignedUploadUrl(s3Key, mimeType)
    return reply.send({ uploadUrl, s3Key, filename, category })
  })

  // POST /transactions/:id/documents/confirm
  app.post('/transactions/:id/documents/confirm', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId, role } = req.user as JwtPayload
    if (role !== 'admin' && !(await repo.isTransactionParty(id, userId))) {
      return reply.status(403).send({ message: 'Forbidden' })
    }
    const { s3Key, filename, category, mimeType } = req.body as {
      s3Key: string; filename: string; category: string; mimeType: string
    }
    const { sizeBytes } = await verifyS3Upload(s3Key)
    const doc = await repo.createTransactionDocument({
      transactionId: id, uploaderId: userId, category, s3Key, filename, sizeBytes, mimeType,
    })
    emitter.emit('document.uploaded', {
      documentId: doc.id, transactionId: id, uploaderId: userId, docType: category,
    })
    return reply.status(201).send(doc)
  })

  // GET /transactions/:id/documents/:docId/download
  app.get('/transactions/:id/documents/:docId/download', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id, docId } = req.params as { id: string; docId: string }
    const { userId, role } = req.user as JwtPayload
    if (role !== 'admin' && !(await repo.isTransactionParty(id, userId))) {
      return reply.status(403).send({ message: 'Forbidden' })
    }
    const doc = await repo.findTransactionDocument(docId)
    if (!doc || doc.transaction_id !== id) return reply.status(404).send({ message: 'Not found' })
    await repo.incrementDownloadCount(docId)
    // Audit log (fire and forget)
    query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id)
       VALUES ($1, 'document.downloaded', 'transaction_document', $2)`,
      [userId, docId]
    ).catch(() => {})
    const downloadUrl = await getPresignedDownloadUrl(doc.s3_key)
    return reply.send({ downloadUrl, filename: doc.filename, expiresIn: 300 })
  })

  // DELETE /transactions/:id/documents/:docId
  app.delete('/transactions/:id/documents/:docId', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { docId } = req.params as { id: string; docId: string }
    const { userId, role } = req.user as JwtPayload
    const doc = await repo.findTransactionDocument(docId)
    if (!doc) return reply.status(404).send({ message: 'Not found' })
    if (role !== 'admin' && doc.uploader_id !== userId) {
      return reply.status(403).send({ message: 'Forbidden' })
    }
    await query(`DELETE FROM transaction_documents WHERE id = $1`, [docId])
    return reply.status(204).send()
  })
})
