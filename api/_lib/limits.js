/**
 * Upload limits.
 *
 * Every value is an env override with a permissive default, so raising the
 * ceiling is a dashboard change rather than a deploy. The point of the defaults
 * is not to ration space — it is that a presigned PUT with no declared size is
 * an unbounded write, and the first sign of a runaway upload would otherwise be
 * the bill.
 */

const GB = 1024 ** 3

function envBytes(name, fallback) {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/**
 * Largest single file. Capped just under R2's 4.995 GiB single-PUT ceiling —
 * a larger value would pass this check and then be refused by storage itself,
 * which reads as a random upload failure. Going above it needs multipart.
 */
export function maxFileBytes() {
  return envBytes('MAX_UPLOAD_BYTES', Math.floor(4.9 * GB))
}

/** Largest total for one submission across all its source files. */
export function maxSubmissionBytes() {
  return envBytes('MAX_SUBMISSION_BYTES', 20 * GB)
}

/**
 * Per-creator ceiling, and a whole-library ceiling. Both default to Infinity:
 * unlimited until someone deliberately sets a number, so this never silently
 * blocks a creator mid-upload.
 */
export function maxCreatorBytes() {
  return envBytes('MAX_CREATOR_BYTES', Infinity)
}

export function maxLibraryBytes() {
  return envBytes('MAX_LIBRARY_BYTES', Infinity)
}

export function formatBytes(n) {
  if (!Number.isFinite(n)) return 'unlimited'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let v = Number(n)
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i += 1
  }
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)}${units[i]}`
}
