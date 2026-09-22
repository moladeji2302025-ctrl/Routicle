import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../../lib/api'
import RichText from '../../components/RichText'

const EMPTY = { id: null, title: '', excerpt: '', body: '', coverUrl: '', authorName: '', status: 'draft' }

function fmt(d) {
  return d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

/** Write, preview and publish the Routicle blog. Marketing and admins. */
export default function AdminBlogPage() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState(null)
  const [form, setForm] = useState(null) // null = list view
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    try {
      const { posts: rows } = await api.fetchAdminBlog()
      setPosts(rows)
    } catch (err) {
      setError(err.message)
      setPosts([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setNotice('')
  }

  async function save(status) {
    setBusy(true)
    setError('')
    try {
      const { post } = await api.saveAdminBlog({ ...form, status: status || form.status })
      setForm({ ...EMPTY, ...post, coverUrl: post.coverUrl || '', authorName: post.authorName || '' })
      setNotice(post.status === 'published' ? 'Published.' : 'Saved as a draft.')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(post) {
    if (!window.confirm(`Delete "${post.title}"? This can't be undone.`)) return
    try {
      await api.deleteAdminBlog(post.id)
      if (form?.id === post.id) setForm(null)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  // Hands the post to the newsletter composer, which does the sending. The
  // markup is shared, so the body carries over as written.
  function emailIt() {
    const url = `${window.location.origin}/blog/${form.slug}`
    navigate('/admin/email', {
      state: {
        newsletter: {
          subject: form.title,
          preheader: form.excerpt,
          body: `${form.excerpt ? `${form.excerpt}\n\n` : ''}[Read the full post](${url})`,
        },
      },
    })
  }

  if (form) {
    const isNew = !form.id
    return (
      <section className="admin-section">
        <header className="adm-page-head adm-page-head-row">
          <div>
            <h2>{isNew ? 'New post' : 'Edit post'}</h2>
            <p>
              {form.status === 'published' ? 'Live at ' : 'Draft. '}
              {form.slug && form.status === 'published' && <a href={`/blog/${form.slug}`} target="_blank" rel="noreferrer">/blog/{form.slug}</a>}
            </p>
          </div>
          <button type="button" className="settings-btn settings-btn-ghost" onClick={() => setForm(null)}>All posts</button>
        </header>

        {error && <p className="settings-error">{error}</p>}
        {notice && <p className="settings-notice">{notice}</p>}

        <div className="adm-editor">
          <div className="adm-editor-pane">
            <label className="settings-field">
              <span className="settings-field-label">Title</span>
              <input className="settings-input" value={form.title} maxLength={160} onChange={(e) => set('title', e.target.value)} placeholder="What the post is about" />
            </label>
            <label className="settings-field">
              <span className="settings-field-label">Summary</span>
              <input className="settings-input" value={form.excerpt} maxLength={300} onChange={(e) => set('excerpt', e.target.value)} placeholder="One or two lines, shown on the blog page and in search results" />
            </label>
            <div className="admin-form-row">
              <label className="settings-field">
                <span className="settings-field-label">Cover image address</span>
                <input className="settings-input" value={form.coverUrl} onChange={(e) => set('coverUrl', e.target.value)} placeholder="https://…" />
              </label>
              <label className="settings-field">
                <span className="settings-field-label">Author</span>
                <input className="settings-input" value={form.authorName} maxLength={80} onChange={(e) => set('authorName', e.target.value)} placeholder="Shown under the title" />
              </label>
            </div>
            <label className="settings-field">
              <span className="settings-field-label">Post</span>
              <textarea
                className="settings-textarea adm-editor-body"
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
                placeholder={'# A heading\n\nA paragraph with **bold** and a [link](https://routicle.app).\n\n- a bullet\n- another'}
              />
              <span className="settings-field-hint"># heading · - bullet · &gt; quote · **bold** · [text](url) · blank line for a new paragraph</span>
            </label>

            <div className="adm-editor-actions">
              <button type="button" className="settings-btn" disabled={busy || !form.title.trim()} onClick={() => save('draft')}>
                {form.status === 'published' ? 'Unpublish (save as draft)' : 'Save draft'}
              </button>
              <button type="button" className="btn-hero-primary" disabled={busy || !form.title.trim() || form.body.trim().length < 10} onClick={() => save('published')}>
                {busy ? 'Saving…' : form.status === 'published' ? 'Update live post' : 'Publish'}
              </button>
              {!isNew && form.status === 'published' && (
                <button type="button" className="settings-btn settings-btn-ghost" onClick={emailIt}>Email to subscribers…</button>
              )}
            </div>
          </div>

          <aside className="adm-editor-preview" aria-label="Preview">
            <span className="adm-preview-tag">Preview</span>
            {form.coverUrl && /^https?:\/\//i.test(form.coverUrl) && <img className="adm-preview-cover" src={form.coverUrl} alt="" />}
            <h1>{form.title || 'Untitled post'}</h1>
            {form.authorName && <p className="adm-preview-by">By {form.authorName}</p>}
            <RichText source={form.body || 'Nothing written yet.'} className="rich" />
          </aside>
        </div>
      </section>
    )
  }

  return (
    <section className="admin-section">
      <header className="adm-page-head adm-page-head-row">
        <div>
          <h2>Blog</h2>
          <p>Posts appear on the public Blog page once published. Drafts are only visible here.</p>
        </div>
        <button type="button" className="btn-hero-primary" onClick={() => setForm({ ...EMPTY })}>New post</button>
      </header>

      {error && <p className="settings-error">{error}</p>}

      {posts === null ? (
        <p className="explore-empty">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="explore-empty">No posts yet. Write the first one.</p>
      ) : (
        <ul className="adm-people">
          {posts.map((p) => (
            <li key={p.id} className="adm-person">
              <div className="adm-person-main">
                <span className="adm-person-name">{p.title}</span>
                <span className="adm-person-meta">
                  {p.status === 'published' ? `Published ${fmt(p.publishedAt)}` : `Draft · edited ${fmt(p.updatedAt)}`}
                </span>
              </div>
              <span className={p.status === 'published' ? 'adm-chip adm-chip-strong' : 'adm-chip'}>
                {p.status === 'published' ? 'Live' : 'Draft'}
              </span>
              <button type="button" className="settings-btn" onClick={() => setForm({ ...EMPTY, ...p, coverUrl: p.coverUrl || '', authorName: p.authorName || '' })}>Edit</button>
              <button type="button" className="settings-btn settings-btn-danger" onClick={() => remove(p)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
