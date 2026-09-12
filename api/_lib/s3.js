import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'

/**
 * Bucket names are overridable so the same code runs against Neon Object
 * Storage or Cloudflare R2 — both speak the S3 API, and which one is in use is
 * decided entirely by AWS_ENDPOINT_URL_S3 and the credentials beside it.
 */
export const SOURCE_BUCKET = process.env.SOURCE_BUCKET_NAME || 'routicle-sources'
export const PREVIEW_BUCKET = process.env.PREVIEW_BUCKET_NAME || 'routicle-previews'

let client = null

function getClient() {
  if (!client) {
    const required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_ENDPOINT_URL_S3', 'AWS_REGION']
    const missing = required.filter((key) => !process.env[key])
    if (missing.length > 0) {
      throw new Error(`Missing object storage env vars: ${missing.join(', ')}`)
    }
    client = new S3Client({
      region: process.env.AWS_REGION,
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    })
  }
  return client
}

function sanitizeFileName(name) {
  return (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '-').slice(-140)
}

/** Builds a unique object key, namespaced by kind and creator, for a new upload. */
export function buildObjectKey({ creatorId, fileName, kind }) {
  return `${kind}/${creatorId}/${randomUUID()}-${sanitizeFileName(fileName)}`
}

/**
 * Presigned PUT URL the browser uploads straight to, bypassing our server.
 *
 * When `contentLength` is given it is baked into the signature, so the upload
 * must be exactly that many bytes or S3 rejects it. Without that a presigned
 * PUT is an unbounded write: the URL would accept a file of any size, and the
 * first sign of a 40GB upload would be the storage bill.
 */
export async function presignUpload({ bucket, key, contentType, contentLength, expiresIn = 300 }) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ...(contentLength ? { ContentLength: contentLength } : {}),
  })
  return getSignedUrl(getClient(), command, {
    expiresIn,
    ...(contentLength ? { signableHeaders: new Set(['host', 'content-length']) } : {}),
  })
}

/** Actual stored size, so accounting uses what landed rather than what was claimed. */
export async function headObjectSize({ bucket, key }) {
  try {
    const res = await getClient().send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return Number(res.ContentLength) || 0
  } catch {
    // Missing or unreadable: count as zero rather than failing the submission.
    return 0
  }
}

export async function deleteObject({ bucket, key }) {
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  } catch (err) {
    console.error('object delete failed', key, err.message)
  }
}

/** Presigned GET URL for a private-bucket object (source files gated behind entitlement checks). */
export async function presignDownload({ bucket, key, expiresIn = 300, downloadFileName }) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ...(downloadFileName
      ? { ResponseContentDisposition: `attachment; filename="${sanitizeFileName(downloadFileName)}"` }
      : {}),
  })
  return getSignedUrl(getClient(), command, { expiresIn })
}

/**
 * Public URL for an object in the previews bucket — no signing needed.
 *
 * R2 does not serve public objects from its S3 endpoint: a public bucket is
 * reached through an r2.dev subdomain or a bound custom domain, and the bucket
 * name is not part of that path. PUBLIC_PREVIEW_BASE_URL covers that; without
 * it this falls back to the path-style URL Neon Object Storage uses.
 */
export function publicPreviewUrl(key) {
  const base = process.env.PUBLIC_PREVIEW_BASE_URL
  if (base) return `${base.replace(/\/$/, '')}/${key}`
  const endpoint = (process.env.AWS_ENDPOINT_URL_S3 || '').replace(/\/$/, '')
  return `${endpoint}/${PREVIEW_BUCKET}/${key}`
}
