/** Thin client for the real backend (/api/*) — Postgres metadata + Neon Object Storage files. */

import { getAuthToken, clearAuthToken } from './authToken'

export { clearAuthToken }

async function send(path, options, token) {
  return fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}

async function request(path, options = {}) {
  let res = await send(path, options, await getAuthToken())

  // The JWT is short-lived. If one expires between being minted and arriving,
  // drop the cached copy and try once with a fresh one rather than surfacing a
  // spurious "sign in required" to someone who is signed in.
  if (res.status === 401) {
    clearAuthToken()
    const retryToken = await getAuthToken()
    if (retryToken) res = await send(path, options, retryToken)
  }
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
    throw new Error(`${path} did not return JSON (status ${res.status}). The API isn't reachable here.${localHint}`)
  }
  const body = await res.json()
  if (!res.ok) {
    throw new Error(body?.error || `Request to ${path} failed (${res.status})`)
  }
  return body
}

export function upsertCreator(data) {
  return request('/creator/profile', { method: 'POST', body: JSON.stringify(data) })
}

export function fetchApprovedContent(category) {
  const query = category ? `?category=${encodeURIComponent(category)}` : ''
  return request(`/content${query}`)
}

/** The signed-in creator's own uploads, in every moderation state. */
export function fetchMySubmissions() {
  return request('/creator/submissions?mine=1')
}

export function fetchPendingSubmissions() {
  return request('/creator/submissions?status=pending')
}

async function presignUpload({ file, kind, format }) {
  const { uploadUrl, objectKey, publicUrl } = await request('/creator/presign', {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, kind, format, size: file.size }),
  })
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    // Must match what the server signed; the real type is checked from the
    // bytes after upload, not taken from this header.
    headers: { 'Content-Type': 'application/octet-stream' },
    body: file,
  })
  if (!putRes.ok) throw new Error(`Upload of ${file.name} failed (${putRes.status})`)
  return { objectKey, publicUrl }
}

/**
 * Uploads a thumbnail, an optional preview video, and every source-format file straight to
 * Neon Object Storage via presigned URLs, then records the submission in Postgres.
 */
/**
 * A WebP copy of the thumbnail, made in the browser before upload.
 *
 * Capped at 1600px wide, which is more than the feed or the detail view ever
 * shows. Resolves to null when the browser can't encode WebP — Safari's canvas
 * silently hands back a PNG instead — so no variant is uploaded rather than a
 * mislabelled one. The server checks the bytes either way.
 */
async function toWebp(file, { maxWidth = 1600, quality = 0.82 } = {}) {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxWidth / bitmap.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
    if (!blob || blob.type !== 'image/webp') return null
    return new File([blob], 'thumbnail.webp', { type: 'image/webp' })
  } catch {
    return null
  }
}

export async function submitRealUpload({
  creatorEmail,
  title,
  category,
  subCategory,
  description,
  behindTheDesign,
  isAiGenerated,
  thumbnailFile,
  previewVideoFile,
  sourceFiles, // [{ label, file }]
  isTemplate = false,
  templateKind = null,
}) {
  const thumbnail = await presignUpload({ file: thumbnailFile, kind: 'thumbnail' })

  // Best effort: a failure here only means the feed shows the original.
  let thumbnailWebpKey = null
  const webp = await toWebp(thumbnailFile)
  if (webp) {
    try {
      thumbnailWebpKey = (await presignUpload({ file: webp, kind: 'thumbnail-webp' })).objectKey
    } catch {
      thumbnailWebpKey = null
    }
  }

  let previewVideoKey = null
  if (previewVideoFile) {
    const preview = await presignUpload({ file: previewVideoFile, kind: 'preview' })
    previewVideoKey = preview.objectKey
  }

  const sourceObjectKeys = []
  for (const { label, file } of sourceFiles) {
    const uploaded = await presignUpload({ file, kind: 'source', format: label })
    // The filename travels as metadata; the stored key never contains it.
    sourceObjectKeys.push({ label, key: uploaded.objectKey, name: file.name })
  }

  return request('/creator/submissions', {
    method: 'POST',
    body: JSON.stringify({
      creatorEmail,
      title,
      category,
      subCategory,
      fileTypes: sourceFiles.map((f) => f.label),
      description,
      behindTheDesign,
      isAiGenerated,
      thumbnailKey: thumbnail.objectKey,
      thumbnailWebpKey,
      previewVideoKey,
      sourceObjectKeys,
      isTemplate,
      templateKind,
    }),
  })
}

export function moderateSubmission(id, action, note) {
  return request('/admin/moderation', { method: 'POST', body: JSON.stringify({ id, action, note }) })
}

export function markItemFreeRemote(id, isFree) {
  return request(`/content?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ isFree }) })
}

/* ------------------------------------------------ Creative Suite templates */

/** The templates Routicle features, with whether this account can use each. */
export function fetchFeaturedTemplates(organizationId) {
  const q = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ''
  return request(`/library/templates${q}`)
}

/** Uses a template: returns its SVG pages, and counts as a download for its creator. */
export function useTemplate(itemId, organizationId) {
  return request('/library/templates', { method: 'POST', body: JSON.stringify({ itemId, organizationId }) })
}

export function fetchImageAllowance() {
  return request('/suite/generate-image')
}

/** An AI image for a template's photo slot, as a data URL. */
export function generateTemplateImage({ prompt, aspect }) {
  return request('/suite/generate-image', { method: 'POST', body: JSON.stringify({ prompt, aspect }) })
}

export function patchAdminTemplateFeature(id, isFeatured) {
  return request('/admin/content', { method: 'PATCH', body: JSON.stringify({ id, isFeatured }) })
}

/* ------------------------------------------------------------------ email */

/** Which optional email this account receives. Kept on the server so email code can see it. */
export function fetchEmailPreferences() {
  return request('/account/email-preferences')
}

export function saveEmailPreferences(preferences) {
  return request('/account/email-preferences', { method: 'POST', body: JSON.stringify({ preferences }) })
}

/** Has this account done the welcome flow? Answered by the server, not this browser. */
export function fetchOnboarding() {
  return request('/account/onboarding')
}

export function markOnboardingDone() {
  return request('/account/onboarding', { method: 'POST', body: '{}' })
}

/** Asks for the welcome email. Safe to repeat: the server sends it once. */
export function requestWelcomeEmail() {
  return request('/account/welcome', { method: 'POST', body: '{}' })
}

export function fetchAdminEmailStatus() {
  return request('/admin/email')
}

export function fetchAdminEmailLog({ status, q } = {}) {
  const params = new URLSearchParams({ op: 'log' })
  if (status) params.set('status', status)
  if (q) params.set('q', q)
  return request(`/admin/email?${params}`)
}

export function fetchAdminTemplatePreview(name) {
  return request(`/admin/email?op=preview&t=${encodeURIComponent(name)}`)
}

export function sendAdminTestEmail({ to, template } = {}) {
  return request('/admin/email', { method: 'POST', body: JSON.stringify({ op: 'test', to, template }) })
}

export function fetchAdminSuppressions() {
  return request('/admin/email?op=suppressions')
}

export function suppressEmailAddress(email) {
  return request('/admin/email', { method: 'POST', body: JSON.stringify({ op: 'suppress', email }) })
}

export function unsuppressEmailAddress(email) {
  return request(`/admin/email?email=${encodeURIComponent(email)}`, { method: 'DELETE' })
}

export function fetchAdminNewsletter() {
  return request('/admin/newsletter')
}

/** ops: preview | test | create | send-batch */
export function adminNewsletter(op, data = {}) {
  return request('/admin/newsletter', { method: 'POST', body: JSON.stringify({ op, ...data }) })
}

/** Newsletter signup for logged-out visitors. `website` is the honeypot field. */
export function subscribeNewsletter({ email, source, website }) {
  return request('/public/newsletter', { method: 'POST', body: JSON.stringify({ email, source, website }) })
}

/** Returns presigned, time-limited download URLs for a live item's real source files. */
export function requestDownload(itemId, userEmail, organizationId) {
  return request('/library/downloads', { method: 'POST', body: JSON.stringify({ itemId, userEmail, organizationId }) })
}

/** Download history for the active scope — a team's shared log, or your own. */
export function fetchDownloads({ userEmail, organizationId }) {
  const query = organizationId
    ? `?organizationId=${encodeURIComponent(organizationId)}`
    : `?userEmail=${encodeURIComponent(userEmail)}`
  return request(`/library/downloads${query}`)
}

/** Personal (organizationId omitted) or team-shared saved items — real, server-side Collections. */
export function fetchSavedItems({ userId, organizationId }) {
  const query = organizationId ? `?userId=${userId}&organizationId=${organizationId}` : `?userId=${userId}`
  return request(`/library/collections${query}`)
}

export function saveItemRemote({ userId, organizationId, contentItemId, savedByUserId }) {
  return request('/library/collections', {
    method: 'POST',
    body: JSON.stringify({ userId, organizationId, contentItemId, savedByUserId }),
  })
}

export function unsaveItemRemote({ userId, organizationId, contentItemId }) {
  const query = organizationId
    ? `?userId=${userId}&organizationId=${organizationId}&contentItemId=${contentItemId}`
    : `?userId=${userId}&contentItemId=${contentItemId}`
  return request(`/library/collections${query}`, { method: 'DELETE' })
}

/* ---- What's new (public) ---- */

export function fetchUpdates(limit) {
  return request(`/public/updates${limit ? `?limit=${limit}` : ''}`)
}

/** The public blog: the list, or one post by its slug. */
export function submitContact(data) {
  return request('/public/contact', { method: 'POST', body: JSON.stringify(data) })
}

export function fetchBlogPosts() {
  return request('/public/blog')
}

export function fetchBlogPost(slug) {
  return request(`/public/blog?slug=${encodeURIComponent(slug)}`)
}

export function fetchPublicResources() {
  return request('/public/resources')
}

/* ---- AI Suite: Business ---- */

export function fetchStudioProfile() {
  return request('/suite/profile')
}

export function saveStudioProfile(profile) {
  return request('/suite/profile', { method: 'PUT', body: JSON.stringify(profile) })
}

export function fetchProjects() {
  return request('/suite/projects')
}

export function createProject(data) {
  return request('/suite/projects', { method: 'POST', body: JSON.stringify(data) })
}

export function fetchProject(id) {
  return request(`/suite/projects?id=${encodeURIComponent(id)}`)
}

export function patchProject(id, data) {
  return request(`/suite/projects?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteProject(id) {
  return request(`/suite/projects?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function saveProjectForm(projectId, data) {
  return request(`/suite/forms?id=${encodeURIComponent(projectId)}`, { method: 'PUT', body: JSON.stringify(data) })
}

export function saveDocument(data) {
  return request('/suite/documents', { method: 'POST', body: JSON.stringify(data) })
}

export function patchDocument(id, data) {
  return request(`/suite/documents?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteDocument(id) {
  return request(`/suite/documents?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function saveSchedule(projectId, data) {
  return request(`/suite/schedule?id=${encodeURIComponent(projectId)}`, { method: 'PUT', body: JSON.stringify(data) })
}

/** Public, unauthenticated — the link the client actually opens. */
export function fetchPublicForm(slug) {
  return request(`/suite/public?id=${encodeURIComponent(slug)}`)
}

export function submitPublicForm(slug, data) {
  return request(`/suite/public?id=${encodeURIComponent(slug)}`, { method: 'POST', body: JSON.stringify(data) })
}

/* ---- Account ---- */

/** This account's workspaces, each with the caller's real role in it. */
export function fetchMyTeams() {
  return request('/account/teams')
}

export function fetchTeamMembers(organizationId) {
  return request(`/account/members?organizationId=${encodeURIComponent(organizationId)}`)
}

/** Sends a real invitation email. Owner/admin only, enforced server-side. */
export function inviteMemberRemote({ organizationId, email, role }) {
  return request('/account/invite', { method: 'POST', body: JSON.stringify({ organizationId, email, role }) })
}

/** Irreversible. The server re-checks `confirmEmail` against the session's own address. */
/**
 * Checks a password sign-in with Routicle before the browser signs in with
 * Neon Auth. Throws with the server's message on a wrong password or a lock.
 * Resolves true when the check passed, false when the API isn't reachable
 * (local `npm run dev`, which doesn't serve /api).
 */
export async function signInCheck(email, password) {
  const res = await fetch('/api/account/signin-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.headers.get('content-type')?.includes('application/json')) return false
  const body = await res.json()
  if (!res.ok) {
    const err = new Error(body?.error || 'Could not sign you in.')
    err.status = res.status
    throw err
  }
  return true
}

/** Emails a one-time code to the account's own address. */
export function requestAccountDeletionRemote() {
  return request('/account/delete-request', { method: 'POST', body: '{}' })
}

/** Deletes the account, but only with the code from that email. */
export function deleteAccountRemote(code) {
  return request('/account/delete', { method: 'POST', body: JSON.stringify({ code }) })
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

export function grantAdmin(userId, role = 'admin') {
  return request('/admin/users', { method: 'POST', body: JSON.stringify({ userId, role }) })
}

export function fetchAdminSettings() {
  return request('/admin/settings')
}

export function saveAdminSetting(key, value) {
  return request('/admin/settings', { method: 'PATCH', body: JSON.stringify({ key, value }) })
}

export function fetchPublicSettings() {
  return request('/public/settings')
}

export function grantAdminPlan(userId, tier, months) {
  return request('/admin/users', { method: 'PATCH', body: JSON.stringify({ userId, action: 'grant-plan', tier, months }) })
}

export function revokeAdminPlan(userId) {
  return request('/admin/users', { method: 'PATCH', body: JSON.stringify({ userId, action: 'revoke-plan' }) })
}

export function suspendAdminUser(userId, reason) {
  return request('/admin/users', { method: 'PATCH', body: JSON.stringify({ userId, action: 'suspend', reason }) })
}

export function unsuspendAdminUser(userId) {
  return request('/admin/users', { method: 'PATCH', body: JSON.stringify({ userId, action: 'unsuspend' }) })
}

export function fetchAdminLeads({ status, q } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (q) params.set('q', q)
  const qs = params.toString()
  return request(`/admin/leads${qs ? `?${qs}` : ''}`)
}

export function addAdminLead(data) {
  return request('/admin/leads', { method: 'POST', body: JSON.stringify({ op: 'add', ...data }) })
}

export function importAdminLeads(rows) {
  return request('/admin/leads', { method: 'POST', body: JSON.stringify({ op: 'import', rows }) })
}

export function sendAdminLeadOutreach({ leadId, leadIds, subject, body }) {
  return request('/admin/leads', {
    method: 'POST',
    body: JSON.stringify(leadIds ? { op: 'send-batch', leadIds, subject, body } : { op: 'send', leadId, subject, body }),
  })
}

export function patchAdminLead(data) {
  return request('/admin/leads', { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteAdminLead(id) {
  return request(`/admin/leads?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function fetchAdminSupport({ status, q } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (q) params.set('q', q)
  const qs = params.toString()
  return request(`/admin/support${qs ? `?${qs}` : ''}`)
}

export function fetchAdminSupportTicket(id) {
  return request(`/admin/support?id=${encodeURIComponent(id)}`)
}

export function replyAdminSupport(ticketId, body) {
  return request('/admin/support', { method: 'POST', body: JSON.stringify({ ticketId, body }) })
}

export function patchAdminSupport(data) {
  return request('/admin/support', { method: 'PATCH', body: JSON.stringify(data) })
}

export function fetchAdminBlog() {
  return request('/admin/blog')
}

export function saveAdminBlog(post) {
  return post.id
    ? request('/admin/blog', { method: 'PATCH', body: JSON.stringify(post) })
    : request('/admin/blog', { method: 'POST', body: JSON.stringify(post) })
}

export function deleteAdminBlog(id) {
  return request(`/admin/blog?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function fetchAdminAudit(limit = 100) {
  return request(`/admin/audit?limit=${limit}`)
}

export function revokeAdmin(userId) {
  return request(`/admin/users?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
}

export function fetchAdminContent({ status, q, templates } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (templates) params.set('templates', '1')
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
  return request(`/folders?scope=items&folderId=${encodeURIComponent(folderId)}`)
}

export function addFolderItems({ folderId, contentItemIds, addedBy }) {
  return request('/folders?scope=items', {
    method: 'POST',
    body: JSON.stringify({ folderId, contentItemIds, addedBy }),
  })
}

export function removeFolderItem({ folderId, contentItemId }) {
  return request(
    `/folders?scope=items&folderId=${encodeURIComponent(folderId)}&contentItemId=${encodeURIComponent(contentItemId)}`,
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

/* ---------------------------------------------------------------- comments */

export function fetchComments(itemId) {
  return request(`/library/comments?itemId=${encodeURIComponent(itemId)}`)
}

export function postComment({ itemId, body, rating }) {
  return request('/library/comments', {
    method: 'POST',
    body: JSON.stringify({ itemId, body, rating: rating || null }),
  })
}

export function updateComment({ id, body, rating }) {
  return request('/library/comments', {
    method: 'PATCH',
    body: JSON.stringify({ id, body, rating: rating || null }),
  })
}

export function deleteComment(id) {
  return request(`/library/comments?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}
