import { sql } from '../db.js'
import {
  publicPreviewUrl,
  statObject,
  readObjectStart,
  deleteObject,
  ownedPrefix,
  SOURCE_BUCKET,
  PREVIEW_BUCKET,
} from '../s3.js'
import { detectType, ruleFor, mismatchMessage, displayName } from '../fileTypes.js'
import { maxFileBytes, maxSubmissionBytes, formatBytes } from '../limits.js'
import { send, methodGuard, withErrorHandling } from '../http.js'
import { requireUser, requireAdmin } from '../auth.js'
import { requireCreator } from '../guard.js'

const STATUSES = ['pending', 'approved', 'rejected', 'changes-requested']

export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    if (req.method === 'GET' && req.query.mine) {
      // A creator's own work, in every state. Scoped to the session's creator
      // record, so it can only ever return the caller's rows. Separate from the
      // moderation queue below, which is admin only: when creators read their
      // pending work from that queue, locking it down hid it from them too.
      const user = await requireUser(req, res)
      if (!user) return
      const creator = await requireCreator(res, user)
      if (!creator) return

      const rows = await sql`
        SELECT id, title, department, file_types, description, is_free, moderation_status,
               moderation_note, thumbnail_key, preview_video_key, appreciation_count,
               download_count, created_at, updated_at
        FROM content_items
        WHERE creator_id = ${creator.id}
        ORDER BY created_at DESC
        LIMIT 500
      `
      return send(res, 200, {
        items: rows.map((r) => ({
          id: r.id,
          title: r.title,
          // The column is still `department`; the wire format says category.
          category: r.department,
          fileTypes: r.file_types || [],
          description: r.description || '',
          free: r.is_free,
          status: r.moderation_status,
          note: r.moderation_note || '',
          image: r.thumbnail_key ? publicPreviewUrl(r.thumbnail_key) : null,
          hasVideo: Boolean(r.preview_video_key),
          appreciations: r.appreciation_count,
          downloads: r.download_count,
          submittedAt: r.created_at,
          updatedAt: r.updated_at,
        })),
      })
    }

    if (req.method === 'GET') {
      // The moderation queue, including creator email addresses. Admin only.
      const admin = await requireAdmin(req, res)
      if (!admin) return

      const status = req.query.status || 'pending'
      if (!STATUSES.includes(status)) return send(res, 400, { error: 'Unknown status' })
      const rows = await sql`
        SELECT ci.*, c.name AS creator_name, c.email AS creator_email
        FROM content_items ci
        JOIN creators c ON c.id = ci.creator_id
        WHERE ci.moderation_status = ${status}
        ORDER BY ci.created_at DESC
      `
      return send(res, 200, rows)
    }

    if (!methodGuard(req, res, ['POST'])) return

    const user = await requireUser(req, res)
    if (!user) return

    const {
      title,
      category,
      subCategory,
      fileTypes,
      description,
      behindTheDesign,
      isAiGenerated,
      thumbnailKey,
      previewVideoKey,
      sourceObjectKeys,
    } = req.body || {}

    if (!title || !category || !thumbnailKey) {
      return send(res, 400, { error: 'title, category, and thumbnailKey are required' })
    }

    // Attributed to the session's own creator record, so a submission cannot be
    // filed under someone else's name.
    const creator = await requireCreator(res, user)
    if (!creator) return
    const creatorId = creator.id

    /* ---- Every file, checked from its own bytes ---- */

    const sources = Array.isArray(sourceObjectKeys) ? sourceObjectKeys : []
    const files = [
      { kind: 'thumbnail', bucket: PREVIEW_BUCKET, key: thumbnailKey },
      ...(req.body?.thumbnailWebpKey
        ? [{ kind: 'thumbnail-webp', bucket: PREVIEW_BUCKET, key: req.body.thumbnailWebpKey }]
        : []),
      ...(previewVideoKey ? [{ kind: 'preview', bucket: PREVIEW_BUCKET, key: previewVideoKey }] : []),
      ...sources.map((f) => ({
        kind: 'source',
        bucket: SOURCE_BUCKET,
        key: f?.key,
        format: f?.label,
        name: displayName(f?.name),
      })),
    ]

    // Anything this request uploaded is removed if the submission is refused,
    // so a rejected file doesn't sit in the bucket. Only keys under this
    // creator's own prefix are ever touched.
    async function discardAll() {
      await Promise.all(
        files
          .filter((f) => typeof f.key === 'string' && f.key.startsWith(ownedPrefix(f.kind, creatorId)))
          .map((f) => deleteObject({ bucket: f.bucket, key: f.key }))
      )
    }

    async function refuse(status, error, file) {
      await discardAll()
      return send(res, status, { error, file: file || null })
    }

    let totalBytes = 0
    for (const f of files) {
      const rule = ruleFor(f.kind, f.format)
      const label = f.name || rule?.name || f.kind
      if (!rule) return refuse(400, `Unknown file format: ${f.format || 'none given'}.`, label)

      // Ownership. Keys are namespaced by creator, and a submission may only
      // point at its own. Without this, anyone who learned another creator's
      // key could publish that creator's source file as their own work.
      if (typeof f.key !== 'string' || !f.key.startsWith(ownedPrefix(f.kind, creatorId))) {
        return refuse(403, "One of these files doesn't belong to your account.", label)
      }

      const { exists, size } = await statObject({ bucket: f.bucket, key: f.key })
      if (!exists) return refuse(400, `${label} didn't finish uploading. Please try again.`, label)
      if (size === 0) return refuse(400, `${label} is empty.`, label)

      const ceiling = rule.maxBytes || maxFileBytes()
      if (size > ceiling) {
        return refuse(413, `${label} is ${formatBytes(size)}. The limit is ${formatBytes(ceiling)}.`, label)
      }

      // The check that counts: what the file's own bytes say it is.
      const head = await readObjectStart({ bucket: f.bucket, key: f.key, bytes: 64 })
      const detected = detectType(head)
      if (!detected || !rule.types.includes(detected)) {
        return refuse(415, `${label}: ${mismatchMessage(rule, detected)}`, label)
      }

      f.size = size
      f.type = detected
      totalBytes += size
    }

    if (totalBytes > maxSubmissionBytes()) {
      return refuse(413, `This submission is ${formatBytes(totalBytes)}. The limit is ${formatBytes(maxSubmissionBytes())}.`)
    }

    // What's stored per source file: the key, and the creator's own filename
    // kept apart from it as a display name, with the size and verified type.
    const storedSources = files
      .filter((f) => f.kind === 'source')
      .map((f) => ({ label: f.format, key: f.key, name: f.name, size: f.size, type: f.type }))

    const rows = await sql`
      INSERT INTO content_items (
        creator_id, title, department, sub_department, file_types, description,
        behind_the_design, is_ai_generated, thumbnail_key, preview_video_key, source_object_keys,
        total_bytes
      ) VALUES (
        ${creatorId}, ${title}, ${category}, ${subCategory || null}, ${storedSources.map((f) => f.label)}, ${description || null},
        ${behindTheDesign || null}, ${Boolean(isAiGenerated)}, ${thumbnailKey}, ${previewVideoKey || null}, ${JSON.stringify(storedSources)},
        ${totalBytes}
      )
      RETURNING *
    `

    // Running total per creator, so a quota check is one column read rather
    // than a scan of every item they have ever uploaded.
    await sql`UPDATE creators SET storage_bytes = storage_bytes + ${totalBytes} WHERE id = ${creatorId}`

    send(res, 201, rows[0])
  })
}
