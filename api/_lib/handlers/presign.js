import { sql } from '../db.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { buildObjectKey, presignUpload, SOURCE_BUCKET, PREVIEW_BUCKET, publicPreviewUrl } from '../s3.js'
import { maxFileBytes, maxCreatorBytes, maxLibraryBytes, formatBytes } from '../limits.js'
import { requireUser } from '../auth.js'
import { requireCreator } from '../guard.js'
import { ruleFor, extensionOf, TYPES } from '../fileTypes.js'
import { limit, LIMITS } from '../ratelimit.js'

/**
 * Returns a presigned PUT URL the browser uploads directly to — file bytes
 * never touch our server.
 *
 * The creator is resolved from the verified session, not from a `creatorEmail`
 * in the body. Taking it from the body meant anyone could mint upload URLs
 * into anyone else's storage, against their quota, attributed to them.
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (!methodGuard(req, res, ['POST'])) return

    const user = await requireUser(req, res)
    if (!user) return
    if (!(await limit(req, res, { name: 'presign', key: user.id, ...LIMITS.presign }))) return

    const { fileName, kind, format, size } = req.body || {}
    if (!fileName || !kind) {
      return send(res, 400, { error: 'fileName and kind are required' })
    }

    // The first gate, before a single byte is uploaded: the slot must exist,
    // and the file's extension must be one that slot accepts. This is only an
    // early rejection of obvious mistakes. Extensions are trivially renamed, so
    // the check that counts reads the uploaded bytes at submission.
    const rule = ruleFor(kind, format)
    if (!rule) {
      return send(res, 400, {
        error: kind === 'source' ? `Unknown file format: ${format || 'none given'}.` : `Unknown upload slot: ${kind}.`,
      })
    }
    const ext = extensionOf(fileName)
    if (!rule.exts.includes(ext)) {
      return send(res, 415, {
        error: `A ${rule.name} has to be ${rule.exts.join(', ')}. That file is ${ext || 'unnamed'}.`,
      })
    }

    // A declared size is required: it is what gets signed into the URL, and
    // without it the upload is unbounded.
    const declared = Number(size)
    if (!Number.isFinite(declared) || declared <= 0) {
      return send(res, 400, { error: 'size (in bytes) is required' })
    }
    // Each slot has its own ceiling (a thumbnail has no business being 3GB);
    // source files fall back to the global per-file limit.
    const perFile = rule.maxBytes || maxFileBytes()
    if (declared > perFile) {
      return send(res, 413, {
        error: `That file is ${formatBytes(declared)}. The limit per file is ${formatBytes(perFile)}.`,
      })
    }

    const creator = await requireCreator(res, user)
    if (!creator) return
    const creatorId = creator.id
    const rows = [creator]

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
    // Stored under a generated id with the slot's canonical extension. The
    // uploaded filename is never part of the key.
    const canonical = TYPES[rule.types[0]]?.ext || ''
    const objectKey = buildObjectKey({ creatorId, kind, ext: rule.exts.includes(ext) ? ext : canonical })
    const uploadUrl = await presignUpload({
      bucket,
      key: objectKey,
      // Content-Type is set by us from the slot, not echoed from the client.
      contentType: 'application/octet-stream',
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
