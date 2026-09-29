import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireRole } from '../../shared/auth/rbac.js'
import * as repo from './repo.js'
import { applyMortgageTransition } from './mortgage.state-machine.js'
import { emitter } from '../../shared/events/emitter.js'
import { ocrQueue, pdfQueue } from '../../shared/queues/queue-registry.js'
import { getPresignedUploadUrl, getPresignedDownloadUrl, verifyS3Upload, buildS3Key } from '../../shared/storage/presigned.service.js'
import type { JwtPayload } from '../../shared/auth/jwt.plugin.js'

const createAppSchema = z.object({
  loanType: z.string().min(1),
  loanAmount: z.number().positive(),
  propertyValue: z.number().positive(),
  creditScore: z.number().int().min(300).max(850).optional(),
  annualIncome: z.number().positive().optional(),
  monthlyIncome: z.number().positive().optional(),
  monthlyDebt: z.number().min(0).optional(),
})

const stageSchema = z.object({
  action: z.enum([
    'start_doc_collection', 'submit_for_verification', 'request_more_docs',
    'send_to_underwriting', 'conditional_approve', 'final_approve', 'close', 'deny',
  ]),
  denialReason: z.string().optional(),
})

export const mortgageRoutes = fp(async (app: FastifyInstance) => {
  // POST /mortgage/applications
  app.post('/mortgage/applications', {
    preHandler: [app.authenticate, requireRole('buyer', 'admin')],
  }, async (req, reply) => {
    const { userId } = req.user as JwtPayload
    const body = createAppSchema.parse(req.body)
    const app_ = await repo.createApplication({ buyerId: userId, ...body })
    return reply.status(201).send(app_)
  })

  // GET /mortgage/applications
  app.get('/mortgage/applications', {
    preHandler: [app.authenticate, requireRole('buyer', 'lender', 'admin')],
  }, async (req, reply) => {
    const { userId, role } = req.user as JwtPayload
    return reply.send(await repo.listApplications(userId, role))
  })

  // GET /mortgage/applications/:id
  app.get('/mortgage/applications/:id', {
    preHandler: [app.authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const application = await repo.findApplicationById(id)
    if (!application) return reply.status(404).send({ message: 'Not found' })
    const { userId, role } = req.user as JwtPayload
    if (role !== 'admin' && application.buyer_id !== userId && application.lender_id !== userId) {
      return reply.status(403).send({ message: 'Forbidden' })
    }
    const documents = await repo.getMortgageDocumentsForApp(id)
    const conditions = await repo.getConditions(id)
    return reply.send({ ...application, documents, conditions })
  })

  // PATCH /mortgage/applications/:id/stage
  app.patch('/mortgage/applications/:id/stage', {
    preHandler: [app.authenticate, requireRole('lender', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId, role } = req.user as JwtPayload
    const { action, denialReason } = stageSchema.parse(req.body)

    const application = await repo.findApplicationById(id)
    if (!application) return reply.status(404).send({ message: 'Not found' })

    const allDocsVerified = await repo.checkAllDocsVerified(id)
    const hasOpenConditions = await repo.checkHasOpenConditions(id)

    const newStage = applyMortgageTransition(application.stage, action, {
      allDocsVerified, hasOpenConditions, role,
    })

    const updated = await repo.updateApplicationStage(id, newStage, {
      lenderId: userId,
      denialReason: action === 'deny' ? denialReason : undefined,
    })

    emitter.emit('mortgage.stage_changed', {
      applicationId: id, buyerId: application.buyer_id,
      lenderId: userId, oldStage: application.stage, newStage,
    })

    if (newStage === 'final_approval') {
      emitter.emit('mortgage.final_approved', {
        applicationId: id, buyerId: application.buyer_id, lenderId: userId,
      })
      await pdfQueue.add('generate-preapproval-letter', { applicationId: id })
    }

    return reply.send(updated)
  })

  // POST /mortgage/applications/:id/documents/presigned
  app.post('/mortgage/applications/:id/documents/presigned', {
    preHandler: [app.authenticate, requireRole('buyer', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { filename, mimeType, docType } = req.body as {
      filename: string; mimeType: string; docType: string
    }
    const s3Key = buildS3Key(`mortgage/${id}`, docType, filename)
    const uploadUrl = await getPresignedUploadUrl(s3Key, mimeType)
    return reply.send({ uploadUrl, s3Key })
  })

  // POST /mortgage/applications/:id/documents/confirm
  app.post('/mortgage/applications/:id/documents/confirm', {
    preHandler: [app.authenticate, requireRole('buyer', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId } = req.user as JwtPayload
    const { s3Key, filename, docType } = req.body as {
      s3Key: string; filename: string; docType: string
    }
    const { sizeBytes } = await verifyS3Upload(s3Key)
    const doc = await repo.createMortgageDocument({
      applicationId: id, uploaderId: userId, docType, s3Key, filename, sizeBytes,
    })
    // Enqueue OCR
    await ocrQueue.add('submit-ocr', { documentId: doc.id, s3Key, applicationId: id, docType })
    emitter.emit('document.uploaded', {
      documentId: doc.id, applicationId: id, uploaderId: userId, docType,
    })
    return reply.status(201).send(doc)
  })

  // PATCH /mortgage/applications/:id/documents/:docId/corrections
  app.patch('/mortgage/applications/:id/documents/:docId/corrections', {
    preHandler: [app.authenticate, requireRole('lender', 'admin')],
  }, async (req, reply) => {
    const { docId } = req.params as { id: string; docId: string }
    const { userId } = req.user as JwtPayload
    const { corrections } = req.body as { corrections: unknown }
    return reply.send(await repo.saveReviewerCorrections(docId, corrections, userId))
  })

  // Conditions
  app.post('/mortgage/applications/:id/conditions', {
    preHandler: [app.authenticate, requireRole('lender', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId } = req.user as JwtPayload
    const { description } = req.body as { description: string }
    return reply.status(201).send(
      await repo.createCondition({ applicationId: id, description, createdBy: userId })
    )
  })

  app.patch('/mortgage/applications/:id/conditions/:condId', {
    preHandler: [app.authenticate, requireRole('lender', 'admin')],
  }, async (req, reply) => {
    const { condId } = req.params as { id: string; condId: string }
    const { userId } = req.user as JwtPayload
    const { status } = req.body as { status: 'satisfied' | 'waived' }
    return reply.send(await repo.updateCondition(condId, status, userId))
  })

  // Pre-approval letter download
  app.get('/mortgage/applications/:id/preapproval-letter', {
    preHandler: [app.authenticate, requireRole('buyer', 'lender', 'admin')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const application = await repo.findApplicationById(id)
    if (!application?.pre_approval_letter_s3_key) {
      return reply.status(404).send({ message: 'Pre-approval letter not yet generated' })
    }
    const downloadUrl = await getPresignedDownloadUrl(application.pre_approval_letter_s3_key)
    return reply.send({ downloadUrl, expiresIn: 300 })
  })
})
