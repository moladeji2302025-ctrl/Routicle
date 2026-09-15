import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../../lib/api'
import { ChevronRightIcon } from '../../components/icons'

const STATUSES = ['draft', 'sent', 'accepted', 'paid', 'void']

/**
 * The generated document, editable in place.
 *
 * Nothing here is a static download: the merge produces a block tree, and every
 * block is a live field. A figure the client negotiated or a clause that needs
 * softening is edited where it sits rather than exported, opened elsewhere and
 * re-uploaded.
 */
export default function DocumentPage() {
  const { id, docId } = useParams()
  const [doc, setDoc] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const { documents } = await api.fetchProject(id)
      const found = documents.find((d) => d.id === docId)
      if (!found) setError('That document no longer exists.')
      else setDoc(found)
    } catch (err) {
      setError(err.message)
    }
  }, [id, docId])

  useEffect(() => {
    load()
  }, [load])

  function editBlock(sectionId, blockIndex, patch) {
    setDirty(true)
    setNotice('')
    setDoc((d) => ({
      ...d,
      content: {
        ...d.content,
        sections: d.content.sections.map((s) =>
          s.id !== sectionId
            ? s
            : { ...s, blocks: s.blocks.map((b, i) => (i === blockIndex ? { ...b, ...patch } : b)) }
        ),
      },
    }))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      await api.patchDocument(docId, { title: doc.title, content: doc.content })
      setDirty(false)
      setNotice('Saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(status) {
    try {
      await api.patchDocument(docId, { status })
      setDoc((d) => ({ ...d, status }))
    } catch (err) {
      setError(err.message)
    }
  }

  if (error && !doc) return <p className="settings-error">{error}</p>
  if (!doc) return <p className="explore-empty">Loading document…</p>

  return (
    <>
      <div className="suite-crumbs">
        <Link to="/suite/business">Business Suite</Link>
        <ChevronRightIcon size={11} color="currentColor" />
        <Link to={`/suite/business/${id}`}>Project</Link>
        <ChevronRightIcon size={11} color="currentColor" />
        <span>{doc.kind}</span>
      </div>

      <div className="suite-section-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            className="suite-doc-title"
            value={doc.title}
            onChange={(e) => {
              setDirty(true)
              setDoc((d) => ({ ...d, title: e.target.value }))
            }}
          />
          <p className="settings-section-desc">Everything below is editable. Changes stay in Routicle.</p>
        </div>
        <div className="settings-inline-actions">
          <select className="settings-input" style={{ maxWidth: 140 }} value={doc.status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="button" className="settings-btn settings-btn-primary" onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
          <button type="button" className="settings-btn" onClick={() => window.print()}>Print / PDF</button>
        </div>
      </div>

      {error && <p className="settings-error">{error}</p>}
      {notice && <p className="settings-notice">{notice}</p>}

      <article className="doc-sheet">
        {(doc.content?.sections || []).map((section) => (
          <section key={section.id} className="doc-section">
            <h3>{section.heading}</h3>
            {section.blocks.map((block, i) => {
              if (block.type === 'text') {
                return (
                  <textarea
                    key={i}
                    className="doc-text"
                    rows={Math.max(2, Math.ceil((block.value || '').length / 90))}
                    value={block.value || ''}
                    onChange={(e) => editBlock(section.id, i, { value: e.target.value })}
                  />
                )
              }
              if (block.type === 'list') {
                return (
                  <textarea
                    key={i}
                    className="doc-text"
                    rows={Math.max(2, (block.items || []).length)}
                    value={(block.items || []).join('\n')}
                    onChange={(e) =>
                      editBlock(section.id, i, { items: e.target.value.split('\n').filter((l) => l.trim()) })
                    }
                  />
                )
              }
              if (block.type === 'fields') {
                return (
                  <div key={i} className="doc-fields">
                    {(block.rows || []).map(([label, value], ri) => (
                      <div key={ri} className="doc-field">
                        <span>{label}</span>
                        <input
                          className="doc-input"
                          value={value || ''}
                          onChange={(e) => {
                            const rows = block.rows.map((r, x) => (x === ri ? [r[0], e.target.value] : r))
                            editBlock(section.id, i, { rows })
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )
              }
              if (block.type === 'table') {
                return (
                  <table key={i} className="doc-table">
                    <thead>
                      <tr>{(block.columns || []).map((c) => <th key={c}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {(block.rows || []).map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci}>
                              <input
                                className="doc-input"
                                value={cell || ''}
                                onChange={(e) => {
                                  const rows = block.rows.map((r, x) =>
                                    x === ri ? r.map((c, y) => (y === ci ? e.target.value : c)) : r
                                  )
                                  editBlock(section.id, i, { rows })
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
              if (block.type === 'signature') {
                return (
                  <div key={i} className="doc-signatures">
                    {(block.parties || []).map((p) => (
                      <div key={p}>
                        <span>{p} signature</span>
                        <div className="doc-sign-line" />
                        <span>Date</span>
                        <div className="doc-sign-line" />
                      </div>
                    ))}
                  </div>
                )
              }
              return null
            })}
          </section>
        ))}
      </article>
    </>
  )
}
