import { sql } from '../_lib/db.js'
import { send, methodGuard, withErrorHandling } from '../_lib/http.js'
import { buildObjectKey, presignUpload, SOURCE_BUCKET, PREVIEW_BUCKET, publicPreviewUrl } from '../_lib/s3.js'
import { maxFileBytes, maxCreatorBytes, maxLibraryBytes, formatBytes } from '../_lib/limits.js'

/** Returns a presigned PUT URL the browser uploads directly to — file bytes never touch our server. */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['POST'])) return

    const { creatorEmail, fileName, contentType, kind, size } = req.body || {}
    if (!creatorEmail || !fileName || !kind) {
      return send(res, 400, { error: 'creatorEmail, fileName, and kind are required' })
    }
    if (!['source', 'thumbnail', 'preview'].includes(kind)) {
      return send(res, 400, { error: 'kind must be one of source, thumbnail, preview' })
    }

    // A declared size is required: it is what gets signed into the URL, and
    // without it the upload is unbounded.
    const declared = Number(size)
    if (!Number.isFinite(declared) || declared <= 0) {
      return send(res, 400, { error: 'size (in bytes) is required' })
    }
    const perFile = maxFileBytes()
    if (declared > perFile) {
      return send(res, 413, {
        error: `That file is ${formatBytes(declared)}. The limit per file is ${formatBytes(perFile)}.`,
      })
    }

    const rows = await sql`SELECT id, storage_bytes FROM creators WHERE email = ${creatorEmail.toLowerCase().trim()}`
    if (rows.length === 0) return send(res, 404, { error: 'creator not found — apply as a creator first' })
    const creatorId = rows[0].id

    // Quotas are unlimited unless deliberately configured, so these are skipped
    // entirely in the default setup rather than costing a query.
    const creatorCap = maxCreatorBytes()
    if (Number.isFinite(creatorCap) && Number(rows[0].storage_bytes) + declared > creatorCap) {
      return send(res, 413, {
        error: `This would put you over your ${formatBytes(creatorCap)} storage allowance.`,
      })
    }

    const libraryCap = maxLibraryBytes()
    if (Number.isFinite(libraryCap)) {
      const [{ total }] = await sql`SELECT COALESCE(SUM(total_bytes),0)::bigint AS total FROM content_items`
      if (Number(total) + declared > libraryCap) {
        return send(res, 507, { error: 'The library is at its configured storage limit. Contact an admin.' })
      }
    }

    const bucket = kind === 'source' ? SOURCE_BUCKET : PREVIEW_BUCKET
    const objectKey = buildObjectKey({ creatorId, fileName, kind })
    const uploadUrl = await presignUpload({
      bucket,
      key: objectKey,
      contentType: contentType || 'application/octet-stream',
      contentLength: declared,
    })

    send(res, 200, {
      uploadUrl,
      objectKey,
      bucket,
      publicUrl: bucket === PREVIEW_BUCKET ? publicPreviewUrl(objectKey) : null,
    })
  })
}
