import { PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3 } from '../../config/s3.js'
import { env } from '../../config/env.js'

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

export function buildS3Key(scope: string, id: string, filename: string): string {
  const ext = filename.split('.').pop() ?? 'bin'
  const slug = filename.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase()
  return `${scope}/${id}/${Date.now()}-${slug}.${ext}`
}

export async function getPresignedUploadUrl(
  s3Key: string,
  mimeType: string,
  expiresIn = 900 // 15 min
): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw { statusCode: 400, message: `Unsupported file type: ${mimeType}` }
  }

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: s3Key,
    ContentType: mimeType,
  })

  return getSignedUrl(s3, command, { expiresIn })
}

export async function getPresignedDownloadUrl(
  s3Key: string,
  expiresIn = 300 // 5 min
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: s3Key,
  })

  return getSignedUrl(s3, command, { expiresIn })
}

export async function verifyS3Upload(s3Key: string): Promise<{ sizeBytes: number }> {
  try {
    const result = await s3.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: s3Key }))
    return { sizeBytes: result.ContentLength ?? 0 }
  } catch {
    throw { statusCode: 400, message: 'File not found in storage — upload may have failed' }
  }
}
