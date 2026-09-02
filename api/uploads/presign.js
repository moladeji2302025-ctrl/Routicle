import { sql } from '../_lib/db.js'
import { send, methodGuard, withErrorHandling } from '../_lib/http.js'
import { buildObjectKey, presignUpload, SOURCE_BUCKET, PREVIEW_BUCKET, publicPreviewUrl } from '../_lib/s3.js'

/** Returns a presigned PUT URL the browser uploads directly to — file bytes never touch our server. */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['POST'])) return

    const { creatorEmail, fileName, contentType, kind } = req.body || {}
    if (!creatorEmail || !fileName || !kind) {
      return send(res, 400, { error: 'creatorEmail, fileName, and kind are required' })
    }
    if (!['source', 'thumbnail', 'preview'].includes(kind)) {
      return send(res, 400, { error: 'kind must be one of source, thumbnail, preview' })
    }

    const rows = await sql`SELECT id FROM creators WHERE email = ${creatorEmail.toLowerCase().trim()}`
    if (rows.length === 0) return send(res, 404, { error: 'creator not found — apply as a creator first' })
    const creatorId = rows[0].id

    const bucket = kind === 'source' ? SOURCE_BUCKET : PREVIEW_BUCKET
    const objectKey = buildObjectKey({ creatorId, fileName, kind })
    const uploadUrl = await presignUpload({ bucket, key: objectKey, contentType: contentType || 'application/octet-stream' })

    send(res, 200, {
      uploadUrl,
      objectKey,
      bucket,
      publicUrl: bucket === PREVIEW_BUCKET ? publicPreviewUrl(objectKey) : null,
    })
  })
}
