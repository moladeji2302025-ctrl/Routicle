/** Thin client for the real backend (/api/*) — Postgres metadata + Neon Object Storage files. */

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    // Admin endpoints verify the Neon Auth session cookie server-side, so it has
    // to actually be sent. Same-origin defaults to 'same-origin' already, but
    // being explicit keeps this correct if the API ever moves to a subdomain.
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const isJson = res.headers.get('content-type')?.includes('application/json')
  if (!isJson) {
    // /api/* are Vercel serverless functions. `npm run dev` and `npm run preview`
    // are Vite only — they don't run functions, so these paths 404 (or fall through
    // to index.html). Fail loudly rather than returning null, which would crash
    // callers expecting an object, and say how to actually run them locally.
    const localHint =
      typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
        ? " Run `npx vercel dev` instead of `npm run dev` to serve /api locally."
        : ''
    throw new Error(`${path} did not return JSON (status ${res.status}) — the API isn't reachable here.${localHint}`)
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

/** Download history for the active scope — a team's shared log, or your own. */
export function fetchDownloads({ userEmail, organizationId }) {
  const query = organizationId
    ? `?organizationId=${encodeURIComponent(organizationId)}`
    : `?userEmail=${encodeURIComponent(userEmail)}`
  return request(`/downloads${query}`)
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

/* ---- What's new (public) ---- */

export function fetchUpdates(limit) {
  return request(`/updates${limit ? `?limit=${limit}` : ''}`)
}

export function fetchPublicResources() {
  return request('/public/resources')
}

/* ---- Admin (session-verified server-side) ---- */

export function fetchAdminSession() {
  return request('/admin/session')
}

export function fetchAdminOverview() {
  return request('/admin/overview')
}

export function fetchAdminUpdates() {
  return request('/admin/updates')
}

export function createUpdate(data) {
  return request('/admin/updates', { method: 'POST', body: JSON.stringify(data) })
}

export function patchUpdate(data) {
  return request('/admin/updates', { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteUpdate(id) {
  return request(`/admin/updates?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function fetchAdminResources() {
  return request('/admin/resources')
}

export function createResource(data) {
  return request('/admin/resources', { method: 'POST', body: JSON.stringify(data) })
}

export function patchResource(data) {
  return request('/admin/resources', { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteResource(id) {
  return request(`/admin/resources?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function fetchAdminUsers(q) {
  return request(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`)
}

export function grantAdmin(userId) {
  return request('/admin/users', { method: 'POST', body: JSON.stringify({ userId }) })
}

export function revokeAdmin(userId) {
  return request(`/admin/users?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
}

export function fetchAdminContent({ status, q } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (q) params.set('q', q)
  const query = params.toString()
  return request(`/admin/content${query ? `?${query}` : ''}`)
}

export function patchAdminContent(data) {
  return request('/admin/content', { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteAdminContent(id) {
  return request(`/admin/content?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/* ---- Team folders ---- */

export function fetchFolders(organizationId) {
  return request(`/folders?organizationId=${encodeURIComponent(organizationId)}`)
}

export function createFolder({ organizationId, name, createdBy, isDefault }) {
  return request('/folders', {
    method: 'POST',
    body: JSON.stringify({ organizationId, name, createdBy, isDefault }),
  })
}

export function updateFolder({ id, name, isStarred }) {
  return request('/folders', { method: 'PATCH', body: JSON.stringify({ id, name, isStarred }) })
}

export function deleteFolder(id) {
  return request(`/folders?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function fetchFolderItems(folderId) {
  return request(`/folders/items?folderId=${encodeURIComponent(folderId)}`)
}

export function addFolderItems({ folderId, contentItemIds, addedBy }) {
  return request('/folders/items', {
    method: 'POST',
    body: JSON.stringify({ folderId, contentItemIds, addedBy }),
  })
}

export function removeFolderItem({ folderId, contentItemId }) {
  return request(
    `/folders/items?folderId=${encodeURIComponent(folderId)}&contentItemId=${encodeURIComponent(contentItemId)}`,
    { method: 'DELETE' }
  )
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
