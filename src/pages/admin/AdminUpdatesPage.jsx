import { useEffect, useState } from 'react'
import * as api from '../../lib/api'

const CATEGORIES = [
  { id: 'feature', label: 'New feature' },
  { id: 'improvement', label: 'Improvement' },
  { id: 'fix', label: 'Fix' },
  { id: 'announcement', label: 'Announcement' },
]

const EMPTY = {
  title: '',
  body: '',
  category: 'feature',
  linkUrl: '',
  linkLabel: '',
  isPinned: false,
  isPublished: true,
}

export default function AdminUpdatesPage() {
  const [updates, setUpdates] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    try {
      const { updates: rows } = await api.fetchAdminUpdates()
      setUpdates(rows)
    } catch (err) {
      setError(err.message)
      setUpdates([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setNotice('')
  }

  function startEdit(u) {
    setEditingId(u.id)
    setForm({
      title: u.title,
      body: u.body,
      category: u.category,
      linkUrl: u.linkUrl || '',
      linkLabel: u.linkLabel || '',
      isPinned: u.isPinned,
      isPublished: u.isPublished,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY)
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) {
      setError('A title and body are required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (editingId) await api.patchUpdate({ id: editingId, ...form })
      else await api.createUpdate(form)
      cancelEdit()
      await load()
      setNotice(editingId ? 'Update saved.' : 'Update posted.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function act(fn) {
    setError('')
    try {
      await fn()
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <section className="admin-section">
        <h2>{editingId ? 'Edit update' : "Post a new update"}</h2>
        <p className="settings-section-desc">
          Published updates appear on every signed-in user's dashboard under “What's new”, and on
          the public /updates page.
        </p>

        <form className="admin-form" onSubmit={submit}>
          <label className="settings-stack-field">
            <span className="settings-stack-label">Title</span>
            <input
              type="text"
              className="settings-input"
              value={form.title}
              placeholder="Team folders are here"
              onChange={(e) => set('title', e.target.value)}
              required
            />
          </label>

          <label className="settings-stack-field">
            <span className="settings-stack-label">Body</span>
            <textarea
              className="settings-textarea"
              rows={4}
              value={form.body}
              placeholder="What changed, and why it matters to the people reading it."
              onChange={(e) => set('body', e.target.value)}
              required
            />
          </label>

          <div className="admin-form-row">
            <label className="settings-stack-field">
              <span className="settings-stack-label">Category</span>
              <select
                className="settings-input"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>

            <label className="settings-stack-field">
              <span className="settings-stack-label">Link (optional)</span>
              <input
                type="text"
                className="settings-input"
                value={form.linkUrl}
                placeholder="/team"
                onChange={(e) => set('linkUrl', e.target.value)}
              />
            </label>

            <label className="settings-stack-field">
              <span className="settings-stack-label">Link label</span>
              <input
                type="text"
                className="settings-input"
                value={form.linkLabel}
                placeholder="Try it"
                onChange={(e) => set('linkLabel', e.target.value)}
              />
            </label>
          </div>

          <div className="admin-check-row">
            <label className="explore-checkbox">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => set('isPublished', e.target.checked)}
              />
              Publish immediately
            </label>
            <label className="explore-checkbox">
              <input type="checkbox" checked={form.isPinned} onChange={(e) => set('isPinned', e.target.checked)} />
              Pin to the top
            </label>
          </div>

          {error && <p className="settings-error">{error}</p>}
          {notice && <p className="settings-notice">{notice}</p>}

          <div className="settings-actions">
            <button type="submit" className="settings-btn settings-btn-primary" disabled={busy}>
              {busy ? 'Saving…' : editingId ? 'Save changes' : 'Post update'}
            </button>
            {editingId && (
              <button type="button" className="settings-btn settings-btn-ghost" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin-section">
        <h2>All updates</h2>
        {updates === null ? (
          <p className="explore-empty">Loading…</p>
        ) : updates.length === 0 ? (
          <p className="explore-empty">Nothing posted yet.</p>
        ) : (
          <div className="download-list">
            {updates.map((u) => (
              <div key={u.id} className="download-row">
                <span className={`update-tag update-tag-${u.category}`}>{u.category}</span>
                <div className="download-info">
                  <span className="download-title">
                    {u.title}
                    {u.isPinned && <span className="settings-pill">Pinned</span>}
                  </span>
                  <span className="download-meta">
                    {u.isPublished
                      ? `Published ${new Date(u.publishedAt || u.createdAt).toLocaleDateString()}`
                      : 'Draft — not visible to users'}
                  </span>
                </div>
                <button
                  type="button"
                  className="settings-btn"
                  onClick={() => act(() => api.patchUpdate({ id: u.id, isPublished: !u.isPublished }))}
                >
                  {u.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button type="button" className="settings-btn" onClick={() => startEdit(u)}>Edit</button>
                <button
                  type="button"
                  className="settings-btn settings-btn-danger"
                  onClick={() => act(() => api.deleteUpdate(u.id))}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
