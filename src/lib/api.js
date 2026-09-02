/** Thin client for the real backend (/api/*) — Postgres metadata + Neon Object Storage files. */

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await res.json() : null
  if (!res.ok) {
    throw new Error(body?.error || `Request to ${path} failed (${res.status})`)
  }
  return body
}

export function upsertCreator(data) {
  return request('/creators', { method: 'POST', body: JSON.stringify(data) })
}

export function fetchApprovedContent(department) {
  const query = department ? `?department=${encodeURIComponent(department)}` : ''
  return request(`/content${query}`)
}

export function fetchPendingSubmissions() {
  return request('/submissions?status=pending')
}

async function presignUpload({ creatorEmail, file, kind }) {
  const { uploadUrl, objectKey, publicUrl } = await request('/uploads/presign', {
    method: 'POST',
    body: JSON.stringify({ creatorEmail, fileName: file.name, contentType: file.type, kind }),
  })
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!putRes.ok) throw new Error(`Upload of ${file.name} failed (${putRes.status})`)
  return { objectKey, publicUrl }
}

/**
 * Uploads a thumbnail, an optional preview video, and every source-format file straight to
 * Neon Object Storage via presigned URLs, then records the submission in Postgres.
 */
export async function submitRealUpload({
  creatorEmail,
  title,
  department,
  subDepartment,
  description,
  behindTheDesign,
  isAiGenerated,
  thumbnailFile,
  previewVideoFile,
  sourceFiles, // [{ label, file }]
}) {
  const thumbnail = await presignUpload({ creatorEmail, file: thumbnailFile, kind: 'thumbnail' })

  let previewVideoKey = null
  if (previewVideoFile) {
    const preview = await presignUpload({ creatorEmail, file: previewVideoFile, kind: 'preview' })
    previewVideoKey = preview.objectKey
  }

  const sourceObjectKeys = []
  for (const { label, file } of sourceFiles) {
    const uploaded = await presignUpload({ creatorEmail, file, kind: 'source' })
    sourceObjectKeys.push({ label, key: uploaded.objectKey })
  }

  return request('/submissions', {
    method: 'POST',
    body: JSON.stringify({
      creatorEmail,
      title,
      department,
      subDepartment,
      fileTypes: sourceFiles.map((f) => f.label),
      description,
      behindTheDesign,
      isAiGenerated,
      thumbnailKey: thumbnail.objectKey,
      previewVideoKey,
      sourceObjectKeys,
    }),
  })
}

export function moderateSubmission(id, action, note) {
  return request('/moderation', { method: 'POST', body: JSON.stringify({ id, action, note }) })
}

export function markItemFreeRemote(id, isFree) {
  return request(`/content/${id}`, { method: 'PATCH', body: JSON.stringify({ isFree }) })
}

/** Returns presigned, time-limited download URLs for a live item's real source files. */
export function requestDownload(itemId, userEmail) {
  return request('/downloads', { method: 'POST', body: JSON.stringify({ itemId, userEmail }) })
}

export function triggerFileDownload(url, fileName) {
  const a = document.createElement('a')
  a.href = url
  if (fileName) a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
}
