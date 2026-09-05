/** Thin client for the real backend (/api/*) — Postgres metadata + Neon Object Storage files. */

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const isJson = res.headers.get('content-type')?.includes('application/json')
  if (!isJson) {
    // Vite's local dev server has no /api routes of its own and falls back to serving
    // index.html (status 200) for anything it doesn't recognize — treat that the same as
    // a failure rather than silently returning null, which crashes callers expecting an array/object.
    throw new Error(`${path} did not return JSON (status ${res.status}) — the API isn't reachable here.`)
  }
  const body = await res.json()
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
export function requestDownload(itemId, userEmail, organizationId) {
  return request('/downloads', { method: 'POST', body: JSON.stringify({ itemId, userEmail, organizationId }) })
}

/** A team's shared download history. */
export function fetchTeamDownloads(organizationId) {
  return request(`/downloads?organizationId=${encodeURIComponent(organizationId)}`)
}

/** Personal (organizationId omitted) or team-shared saved items — real, server-side Collections. */
export function fetchSavedItems({ userId, organizationId }) {
  const query = organizationId ? `?userId=${userId}&organizationId=${organizationId}` : `?userId=${userId}`
  return request(`/collections${query}`)
}

export function saveItemRemote({ userId, organizationId, contentItemId, savedByUserId }) {
  return request('/collections', {
    method: 'POST',
    body: JSON.stringify({ userId, organizationId, contentItemId, savedByUserId }),
  })
}

export function unsaveItemRemote({ userId, organizationId, contentItemId }) {
  const query = organizationId
    ? `?userId=${userId}&organizationId=${organizationId}&contentItemId=${contentItemId}`
    : `?userId=${userId}&contentItemId=${contentItemId}`
  return request(`/collections${query}`, { method: 'DELETE' })
}

/* ---- Billing (Paystack) ---- */

/** Starts a checkout; returns the hosted Paystack URL to send the buyer to. */
export function startCheckout({ userId, email, tier, billingCycle, organizationId, returnUrl }) {
  return request('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ userId, email, tier, billingCycle, organizationId, returnUrl }),
  })
}

export function verifyPayment(reference) {
  return request('/billing/verify', { method: 'POST', body: JSON.stringify({ reference }) })
}

export function fetchSubscription({ userId, organizationId }) {
  const query = organizationId ? `?userId=${userId}&organizationId=${organizationId}` : `?userId=${userId}`
  return request(`/billing/subscription${query}`)
}

export function cancelSubscriptionRemote({ userId, organizationId }) {
  const query = organizationId ? `?userId=${userId}&organizationId=${organizationId}` : `?userId=${userId}`
  return request(`/billing/subscription${query}`, { method: 'DELETE' })
}

export function triggerFileDownload(url, fileName) {
  const a = document.createElement('a')
  a.href = url
  if (fileName) a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
}
