import { publicPreviewUrl } from './s3.js'

/**
 * The public shape of a content item, shared by every endpoint that lists or
 * reads one (`contentList.js`, `contentItem.js`, `publicProfile.js`) — kept
 * in one place so a field like `creatorUserId` only has to be added once.
 *
 * Expects `row` to already carry `creator_name`, `creator_user_id` and
 * `is_liked` from the caller's own JOINs (see contentList.js for the query
 * shape) — this function only reshapes, it doesn't query.
 */
export function toFeedShape(row) {
  return {
    id: row.id,
    image: publicPreviewUrl(row.thumbnail_key),
    // A smaller WebP copy for display only, when the uploader's browser could
    // make one. The download is always the original source.
    imageWebp: row.thumbnail_webp_key ? publicPreviewUrl(row.thumbnail_webp_key) : null,
    avatar: '/images/a1.jpg',
    title: row.title,
    creator: row.creator_name,
    // The creator's own account id, when their creator email matches a real
    // signed-in user — lets the client link to a real profile page instead of
    // the name-matched local mock every non-live item still falls back to.
    creatorUserId: row.creator_user_id || null,
    // No creator email and no storage keys in a public projection: the first is
    // harvestable, and the second names the paywalled objects directly. Only
    // the file labels go out, which fileTypes already implies.
    sourceFiles: (row.source_object_keys || []).map((f) => ({ label: f.label })),
    // The column is still `department`; only the wire format was renamed.
    // Renaming it in Postgres is a migration against live rows and changes
    // nothing anyone can see.
    category: row.department,
    appreciations: row.appreciation_count,
    // Whether the current viewer has liked this — false for a logged-out
    // viewer or when the caller didn't join item_appreciations at all.
    isLiked: Boolean(row.is_liked),
    views: row.download_count,
    fileTypes: row.file_types || [],
    free: row.is_free,
    hasVideo: Boolean(row.preview_video_key),
    moderationStatus: row.moderation_status,
    behindTheDesign: row.behind_the_design || '',
    description: row.description || '',
    isLive: true,
  }
}
