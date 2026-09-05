import { useEffect, useState } from 'react'
import * as api from '../../lib/api'

const GROUPS = ['Getting started', 'For creators', 'Working together', 'About Routicle', 'Legal']

const EMPTY = { title: '', description: '', url: '', group: GROUPS[0], sortOrder: 0, isPublished: true }

export default function AdminResourcesPage() {
  const [resources, setResources] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    try {
      const { resources: rows } = await api.fetchAdminResources()
      setResources(rows)
    } catch (err) {
      setError(err.message)
      setResources([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.url.trim()) {
      setError('A title and a link are required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (editingId) await api.patchResource({ id: editingId, ...form })
      else await api.createResource(form)
      setEditingId(null)
      setForm(EMPTY)
      await load()
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
        <h2>{editingId ? 'Edit resource' : 'Add a resource'}</h2>
        <p className="settings-section-desc">
          These appear on the Resources page alongside the built-in entries — no deploy needed.
          Links can be internal routes (<code>/help</code>) or full URLs.
        </p>

        <form className="admin-form" onSubmit={submit}>
          <div className="admin-form-row">
            <label className="settings-stack-field">
              <span className="settings-stack-label">Title</span>
              <input
                type="text"
                className="settings-input"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                required
              />
            </label>
            <label className="settings-stack-field">
              <span className="settings-stack-label">Link</span>
              <input
                type="text"
                className="settings-input"
                value={form.url}
                placeholder="/help or https://…"
                onChange={(e) => set('url', e.target.value)}
                required
              />
            </label>
          </div>

          <label className="settings-stack-field">
            <span className="settings-stack-label">Description</span>
            <input
              type="text"
              className="settings-input"
              value={form.description}
              placeholder="One line on what this is."
              onChange={(e) => set('description', e.target.value)}
            />
          </label>

          <div className="admin-form-row">
            <label className="settings-stack-field">
              <span className="settings-stack-label">Group</span>
              <select className="settings-input" value={form.group} onChange={(e) => set('group', e.target.value)}>
                {GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>
            <label className="settings-stack-field">
              <span className="settings-stack-label">Sort order</span>
              <input
                type="number"
                className="settings-input"
                value={form.sortOrder}
                onChange={(e) => set('sortOrder', Number(e.target.value))}
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
              Visible to users
            </label>
          </div>

          {error && <p className="settings-error">{error}</p>}

          <div className="settings-actions">
            <button type="submit" className="settings-btn settings-btn-primary" disabled={busy}>
              {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add resource'}
            </button>
            {editingId && (
              <button
                type="button"
                className="settings-btn settings-btn-ghost"
                onClick={() => {
                  setEditingId(null)
                  setForm(EMPTY)
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin-section">
        <h2>Added resources</h2>
        {resources === null ? (
          <p className="explore-empty">Loading…</p>
        ) : resources.length === 0 ? (
          <p className="explore-empty">Nothing added yet — the Resources page shows only its built-in entries.</p>
        ) : (
          <div className="download-list">
            {resources.map((r) => (
              <div key={r.id} className="download-row">
                <div className="download-info">
                  <span className="download-title">{r.title}</span>
                  <span className="download-meta">
                    {r.group} · {r.url}
                    {!r.isPublished ? ' · hidden' : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="settings-btn"
                  onClick={() => act(() => api.patchResource({ id: r.id, isPublished: !r.isPublished }))}
                >
                  {r.isPublished ? 'Hide' : 'Show'}
                </button>
                <button
                  type="button"
                  className="settings-btn"
                  onClick={() => {
                    setEditingId(r.id)
                    setForm({
                      title: r.title,
                      description: r.description || '',
                      url: r.url,
                      group: r.group,
                      sortOrder: r.sortOrder,
                      isPublished: r.isPublished,
                    })
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="settings-btn settings-btn-danger"
                  onClick={() => act(() => api.deleteResource(r.id))}
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
