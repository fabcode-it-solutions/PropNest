import { Worker } from 'bullmq'
import {
  TextractClient,
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
} from '@aws-sdk/client-textract'
import { redis } from '../../config/redis.js'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const connection = redis as any
import { ocrQueue } from '../../shared/queues/queue-registry.js'
import { query } from '../../config/db.js'
import { emitter } from '../../shared/events/emitter.js'
import { parseTextractBlocks } from '../../modules/mortgage/ocr/ocr.parser.js'
import { env } from '../../config/env.js'

const textract = new TextractClient({ region: env.AWS_REGION })

export const ocrWorker = new Worker(
  'ocr-processing',
  async (job) => {
    // ── submit-ocr ───────────────────────────────────────────────────────────
    if (job.name === 'submit-ocr') {
      const { documentId, s3Key, applicationId } = job.data as {
        documentId: string
        s3Key: string
        applicationId: string
      }

      await query(
        `UPDATE mortgage_documents SET extraction_status = 'processing' WHERE id = $1`,
        [documentId]
      )

      const cmd = new StartDocumentAnalysisCommand({
        DocumentLocation: {
          S3Object: { Bucket: env.S3_BUCKET, Name: s3Key },
        },
        FeatureTypes: ['FORMS', 'TABLES'],
      })

      const result = await textract.send(cmd)
      const jobId = result.JobId!

      await query(
        `UPDATE mortgage_documents SET textract_job_id = $1 WHERE id = $2`,
        [jobId, documentId]
      )

      // Enqueue poll job with 30s delay
      await ocrQueue.add(
        'poll-ocr',
        { documentId, jobId, applicationId, pollCount: 0 },
        { delay: 30_000 }
      )
    }

    // ── poll-ocr ─────────────────────────────────────────────────────────────
    if (job.name === 'poll-ocr') {
      const { documentId, jobId, applicationId, pollCount } = job.data as {
        documentId: string
        jobId: string
        applicationId: string
        pollCount: number
      }

      const cmd = new GetDocumentAnalysisCommand({ JobId: jobId })
      const result = await textract.send(cmd)

      if (result.JobStatus === 'IN_PROGRESS') {
        if (pollCount >= 20) {
          await query(
            `UPDATE mortgage_documents SET extraction_status = 'failed' WHERE id = $1`,
            [documentId]
          )
          const appRes = await query<{ buyer_id: string }>(
            `SELECT buyer_id FROM mortgage_applications WHERE id = $1`,
            [applicationId]
          )
          emitter.emit('ocr.failed', {
            documentId,
            applicationId,
            buyerId: appRes.rows[0]?.buyer_id ?? '',
            reason: 'Textract job timed out after 20 polls',
          })
          return
        }

        // Re-enqueue with delay
        await ocrQueue.add(
          'poll-ocr',
          { documentId, jobId, applicationId, pollCount: pollCount + 1 },
          { delay: 30_000 }
        )
        return
      }

      if (result.JobStatus === 'FAILED') {
        await query(
          `UPDATE mortgage_documents SET extraction_status = 'failed' WHERE id = $1`,
          [documentId]
        )
        const appRes = await query<{ buyer_id: string }>(
          `SELECT buyer_id FROM mortgage_applications WHERE id = $1`,
          [applicationId]
        )
        emitter.emit('ocr.failed', {
          documentId,
          applicationId,
          buyerId: appRes.rows[0]?.buyer_id ?? '',
          reason: result.StatusMessage ?? 'Textract job failed',
        })
        return
      }

      // SUCCEEDED — enqueue parse
      const blocks = result.Blocks ?? []
      await ocrQueue.add('parse-ocr', { documentId, applicationId, blocks })
    }

    // ── parse-ocr ────────────────────────────────────────────────────────────
    if (job.name === 'parse-ocr') {
      const { documentId, applicationId, blocks } = job.data as {
        documentId: string
        applicationId: string
        blocks: unknown[]
      }

      const docRes = await query<{ doc_type: string }>(
        `SELECT doc_type FROM mortgage_documents WHERE id = $1`,
        [documentId]
      )
      const docType = docRes.rows[0]?.doc_type as string

      const { extractedData, confidenceScores } = parseTextractBlocks(blocks as any, docType as any)

      await query(
        `UPDATE mortgage_documents
         SET extraction_status = 'completed',
             extracted_data = $1,
             confidence_scores = $2
         WHERE id = $3`,
        [JSON.stringify(extractedData), JSON.stringify(confidenceScores), documentId]
      )

      const appRes = await query<{ lender_id: string | null }>(
        `SELECT lender_id FROM mortgage_applications WHERE id = $1`,
        [applicationId]
      )

      emitter.emit('ocr.completed', {
        documentId,
        applicationId,
        lenderId: appRes.rows[0]?.lender_id ?? null,
      })
    }
  },
  {
    connection,
    concurrency: 2,
  }
)

ocrWorker.on('failed', (job, err) => {
  console.error(`[ocr-worker] Job ${job?.id} (${job?.name}) failed:`, err.message)
})
