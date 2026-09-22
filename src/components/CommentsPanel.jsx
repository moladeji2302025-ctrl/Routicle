import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import * as api from '../lib/api'

/* --------------------------------------------------------------- stars --- */

function Stars({ value, size = 15, onChange, label }) {
  const interactive = typeof onChange === 'function'
  const [hover, setHover] = useState(0)
  const shown = hover || value || 0

  const star = (i) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9z"
        fill={i <= shown ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )

  if (!interactive) {
    return (
      <span className="cm-stars" role="img" aria-label={label || `${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i}>{star(i)}</span>
        ))}
      </span>
    )
  }

  return (
    <span className="cm-stars cm-stars-live" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i} star${i === 1 ? '' : 's'}`}
          aria-pressed={value === i}
          onMouseEnter={() => setHover(i)}
          // Clicking the current rating clears it, which is the only way back
          // to a plain comment once a star has been set.
          onClick={() => onChange(value === i ? 0 : i)}
        >
          {star(i)}
        </button>
      ))}
    </span>
  )
}

function when(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  if (mins < 10080) return `${Math.round(mins / 1440)}d ago`
  return d.toLocaleDateString()
}

function Avatar({ name, image }) {
  if (image) return <img src={image} alt="" className="cm-avatar" />
  return <span className="cm-avatar cm-avatar-fallback">{(name || '?').charAt(0).toUpperCase()}</span>
}

/* -------------------------------------------------------------- panel ---- */

export default function CommentsPanel({ itemId }) {
  const { currentUser } = useApp()

  const [comments, setComments] = useState([])
  const [summary, setSummary] = useState({ ratingCount: 0, average: 0, mine: null, isOwnWork: false })
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  const [body, setBody] = useState('')
  const [rating, setRating] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editBody, setEditBody] = useState('')
  const [editRating, setEditRating] = useState(0)

  // Rating your own work is refused by the server, so the form shouldn't offer
  // it. The answer comes from the server too — the public content projection
  // carries no creator email for the browser to compare against.
  const ownWork = Boolean(summary.isOwnWork)

  const load = useCallback(async () => {
    if (!itemId) return
    try {
      const data = await api.fetchComments(itemId)
      setComments(Array.isArray(data.comments) ? data.comments : [])
      // Coerced rather than trusted: Postgres returns COUNT as a bigint and
      // AVG as numeric, which some drivers hand back as strings. A string here
      // passes `> 0` and then throws on `.toFixed`, and a throw during render
      // takes the whole page down.
      const s = data.summary || {}
      setSummary({
        isOwnWork: Boolean(s.isOwnWork),
        ratingCount: Number(s.ratingCount) || 0,
        average: Number(s.average) || 0,
        mine: s.mine == null ? null : Number(s.mine),
      })
      setUnavailable(false)
    } catch {
      // /api isn't served by `npm run dev`, and a mock item has no row to
      // thread against. Say so plainly rather than showing an empty thread
      // that looks like nobody has commented.
      setUnavailable(true)
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  async function submit(e) {
    e.preventDefault()
    if (!body.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await api.postComment({ itemId, body, rating: rating || null })
      setBody('')
      setRating(0)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit(id) {
    if (!editBody.trim()) return
    setError('')
    try {
      await api.updateComment({ id, body: editBody, rating: editRating || null })
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove(id) {
    setError('')
    try {
      await api.deleteComment(id)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const reviews = comments.filter((c) => c.rating)

  return (
    <section className="cm">
      <header className="cm-head">
        <h2>
          {comments.length > 0 ? `${comments.length} comment${comments.length === 1 ? '' : 's'}` : 'Comments'}
        </h2>

        {summary.ratingCount > 0 && (
          <div className="cm-summary">
            <Stars value={Math.round(summary.average)} label={`${summary.average} out of 5`} />
            <strong>{summary.average.toFixed(1)}</strong>
            <span>
              {summary.ratingCount} review{summary.ratingCount === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </header>

      {unavailable ? (
        <p className="cm-empty">Comments aren't available for this piece.</p>
      ) : (
        <>
          {!currentUser ? (
            <p className="cm-signin">
              <Link to="/signin">Sign in</Link> to leave a comment or review.
            </p>
          ) : (
            <form className="cm-form" onSubmit={submit}>
              <Avatar name={currentUser.name} image={currentUser.image} />
              <div className="cm-form-body">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={ownWork ? 'Reply to feedback on your work…' : 'Share what you think of this piece…'}
                  rows={3}
                  maxLength={2000}
                />
                <div className="cm-form-foot">
                  {ownWork ? (
                    <span className="cm-note">You can't review your own work.</span>
                  ) : (
                    <label className="cm-rate">
                      <span>{summary.mine ? 'Your rating' : 'Add a rating'}</span>
                      <Stars value={rating} onChange={setRating} size={17} />
                    </label>
                  )}
                  <button type="submit" className="cm-post" disabled={!body.trim() || busy}>
                    {busy ? 'Posting…' : rating ? 'Post review' : 'Post comment'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {error && <p className="cm-error">{error}</p>}

          {loading ? (
            <p className="cm-empty">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="cm-empty">No comments yet. Be the first to say something.</p>
          ) : (
            <ul className="cm-list">
              {comments.map((c) => (
                <li key={c.id} className="cm-item">
                  {c.authorUserId ? (
                    <Link to={`/people/${c.authorUserId}`} className="cm-author-link">
                      <Avatar name={c.authorName} image={c.authorImage} />
                    </Link>
                  ) : (
                    <Avatar name={c.authorName} image={c.authorImage} />
                  )}
                  <div className="cm-item-body">
                    <div className="cm-item-head">
                      {c.authorUserId ? (
                        <Link to={`/people/${c.authorUserId}`} className="cm-author-link">
                          <strong>{c.authorName}</strong>
                        </Link>
                      ) : (
                        <strong>{c.authorName}</strong>
                      )}
                      {c.rating && <Stars value={c.rating} size={13} />}
                      <span className="cm-when">
                        {when(c.createdAt)}
                        {c.editedAt ? ' · edited' : ''}
                      </span>
                    </div>

                    {editingId === c.id ? (
                      <div className="cm-edit">
                        <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3} maxLength={2000} />
                        <div className="cm-edit-foot">
                          <Stars value={editRating} onChange={setEditRating} size={16} />
                          <div className="cm-edit-actions">
                            <button type="button" className="cm-link" onClick={() => setEditingId(null)}>
                              Cancel
                            </button>
                            <button type="button" className="cm-post" onClick={() => saveEdit(c.id)} disabled={!editBody.trim()}>
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="cm-text">{c.body}</p>
                    )}

                    {(c.isMine || c.canDelete) && editingId !== c.id && (
                      <div className="cm-item-actions">
                        {c.isMine && (
                          <button
                            type="button"
                            className="cm-link"
                            onClick={() => {
                              setEditingId(c.id)
                              setEditBody(c.body)
                              setEditRating(c.rating || 0)
                            }}
                          >
                            Edit
                          </button>
                        )}
                        <button type="button" className="cm-link cm-link-danger" onClick={() => remove(c.id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {reviews.length > 0 && (
            <p className="cm-foot">
              {reviews.length} of these {reviews.length === 1 ? 'is a' : 'are'} rated review
              {reviews.length === 1 ? '' : 's'}.
            </p>
          )}
        </>
      )}
    </section>
  )
}
