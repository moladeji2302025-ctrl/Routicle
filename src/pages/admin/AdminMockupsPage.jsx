import { useEffect, useRef, useState } from 'react'
import * as api from '../../lib/api'
import { UploadIcon } from '../../components/icons'

const CATEGORIES = ['mug', 'tshirt', 'cap', 'tote', 'box', 'book', 'billboard', 'other']
const CATEGORY_LABEL = {
  mug: 'Mug', tshirt: 'T-shirt', cap: 'Cap', tote: 'Tote / bag', box: 'Box / package', book: 'Book', billboard: 'Billboard', other: 'Other',
}

function titleFromFileName(name) {
  return name
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

function imageSize(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: null, height: null })
    img.src = url
  })
}

export default function AdminMockupsPage() {
  const [templates, setTemplates] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState([]) // [{name, status}]
  const fileRef = useRef(null)

  async function load() {
    try {
      const { templates: rows } = await api.fetchAdminMockups()
      setTemplates(rows)
    } catch (err) {
      setError(err.message)
      setTemplates([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function onFiles(e) {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    setError('')
    setUploading(files.map((f) => ({ name: f.name, status: 'uploading' })))

    for (const file of files) {
      try {
        const imageKey = await api.uploadAdminMockupPhoto(file)
        const localUrl = URL.createObjectURL(file)
        const { width, height } = await imageSize(localUrl)
        URL.revokeObjectURL(localUrl)
        await api.createAdminMockup({ title: titleFromFileName(file.name), category: 'other', imageKey, width, height })
        setUploading((u) => u.map((f) => (f.name === file.name ? { ...f, status: 'done' } : f)))
      } catch (err) {
        setUploading((u) => u.map((f) => (f.name === file.name ? { ...f, status: `failed: ${err.message}` } : f)))
      }
    }
    await load()
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

  const grouped = templates
    ? CATEGORIES.map((cat) => ({ cat, rows: templates.filter((t) => t.category === cat) })).filter((g) => g.rows.length)
    : []

  return (
    <>
      <section className="admin-section">
        <h2>Mockup templates</h2>
        <p className="settings-section-desc">
          Background photos anyone can drop their own logo onto in Mockup Studio — a mug, a t-shirt, a box. Upload one
          or many; the free-transform corners work the same on every one, so nothing else needs setting up.
        </p>

        <button type="button" className="cs-drop" onClick={() => fileRef.current?.click()}>
          <UploadIcon size={22} color="currentColor" />
          <strong>Upload photos</strong>
          <span>JPEG, PNG or WebP, up to 12MB each. You can select several at once.</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />

        {uploading.length > 0 && (
          <ul className="adm-mockup-uploads">
            {uploading.map((f) => (
              <li key={f.name}>{f.name} — {f.status}</li>
            ))}
          </ul>
        )}

        {error && <p className="settings-error">{error}</p>}
      </section>

      <section className="admin-section">
        <h2>Library</h2>
        {templates === null ? (
          <p className="explore-empty">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="explore-empty">No templates yet — upload a photo above to start the library.</p>
        ) : (
          grouped.map((g) => (
            <div key={g.cat} className="adm-mockup-group">
              <h3>{CATEGORY_LABEL[g.cat]} <span>({g.rows.length})</span></h3>
              <div className="adm-mockup-grid">
                {g.rows.map((t) => (
                  <div key={t.id} className={t.isPublished ? 'adm-mockup-card' : 'adm-mockup-card adm-mockup-hidden'}>
                    <img src={t.image} alt="" />
                    <div className="adm-mockup-card-body">
                      <input
                        className="settings-input"
                        defaultValue={t.title}
                        onBlur={(e) => {
                          if (e.target.value.trim() && e.target.value !== t.title) {
                            act(() => api.patchAdminMockup({ id: t.id, title: e.target.value.trim() }))
                          }
                        }}
                      />
                      <select
                        className="settings-input"
                        value={t.category}
                        onChange={(e) => act(() => api.patchAdminMockup({ id: t.id, category: e.target.value }))}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                        ))}
                      </select>
                      <div className="adm-mockup-card-actions">
                        <button
                          type="button"
                          className="settings-btn"
                          onClick={() => act(() => api.patchAdminMockup({ id: t.id, isPublished: !t.isPublished }))}
                        >
                          {t.isPublished ? 'Hide' : 'Show'}
                        </button>
                        <button
                          type="button"
                          className="settings-btn settings-btn-danger"
                          onClick={() => {
                            if (window.confirm(`Delete "${t.title}"? This can't be undone.`)) {
                              act(() => api.deleteAdminMockup(t.id))
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </>
  )
}
