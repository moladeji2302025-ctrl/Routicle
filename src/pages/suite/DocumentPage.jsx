import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../../lib/api'
import { ChevronRightIcon } from '../../components/icons'
import DocumentRenderer, { PROPOSAL_PAGE_LABELS } from '../../components/docs/DocumentRenderer'
import StylePicker, { rememberedStyle } from '../../components/docs/StylePicker'
import { findStyle } from '../../data/documentStyles'
import { buildDocument, answersByMeaning } from '../../data/documentTemplates'

const STATUSES = ['draft', 'sent', 'accepted', 'paid', 'void']
const SAVE_DELAY = 900

/**
 * A generated document, laid out as designed pages and edited where it sits.
 *
 * Changes save themselves a moment after you stop typing, so there is no save
 * button to forget. Style and accent colour change the look without touching
 * the content. Print / PDF uses the browser's own PDF writer, which keeps text
 * selectable and vector-sharp.
 */
export default function DocumentPage() {
  const { id, docId } = useParams()
  const [doc, setDoc] = useState(null)
  const [ctx, setCtx] = useState(null)
  const [saveState, setSaveState] = useState('saved') // saved | pending | saving | error
  const [error, setError] = useState('')

  const latest = useRef(null)
  const timer = useRef(null)

  const load = useCallback(async () => {
    try {
      const [detail, { profile }] = await Promise.all([api.fetchProject(id), api.fetchStudioProfile()])
      const found = detail.documents.find((d) => d.id === docId)
      if (!found) setError('That document no longer exists.')
      else setDoc(found)
      setCtx({ detail, profile })
    } catch (err) {
      setError(err.message)
    }
  }, [id, docId])

  useEffect(() => {
    load()
  }, [load])

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    const d = latest.current
    if (!d) return
    latest.current = null
    setSaveState('saving')
    try {
      await api.patchDocument(docId, { title: d.title, content: d.content })
      setSaveState(latest.current ? 'pending' : 'saved')
    } catch (err) {
      latest.current = latest.current || d
      setSaveState('error')
      setError(err.message)
    }
  }, [docId])

  // Anything still unsaved goes out when leaving the page.
  useEffect(() => {
    const onLeave = (e) => {
      if (latest.current) {
        flush()
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', onLeave)
    return () => {
      window.removeEventListener('beforeunload', onLeave)
      if (latest.current) flush()
    }
  }, [flush])

  function change(next) {
    setDoc(next)
    latest.current = next
    setSaveState('pending')
    setError('')
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY)
  }

  const setContent = (content) => change({ ...doc, content })

  async function setStatus(status) {
    try {
      await api.patchDocument(docId, { status })
      setDoc((d) => ({ ...d, status }))
    } catch (err) {
      setError(err.message)
    }
  }

  /** Rebuilds from the latest profile, project and answers, keeping the look. */
  function rebuild() {
    if (!ctx?.profile) {
      setError('Set up your studio profile first, since the documents are built from it.')
      return
    }
    const v2 = doc.content?.version === 2
    if (v2 && !window.confirm('Rebuild this document from your studio profile and the project? Edits you made on the page will be replaced.')) return
    const { detail, profile } = ctx
    const latestAnswers = detail.submissions[0]
    const figures = detail.project.figures || {}
    const content = buildDocument(doc.kind, {
      studio: profile,
      project: detail.project,
      a: latestAnswers ? answersByMeaning(latestAnswers.answers, detail.form?.questions || []) : {},
      packages: figures.packages || [],
      lines: figures.lines || [],
      invoiceNumber: doc.content?.number,
      period: doc.period || undefined,
      style: v2 ? doc.content.style : rememberedStyle(),
      accent: v2 ? doc.content.accent : null,
    })
    change({ ...doc, content })
  }

  if (error && !doc) return <p className="settings-error">{error}</p>
  if (!doc) return <p className="explore-empty">Loading document…</p>

  const crumbs = (
    <div className="suite-crumbs">
      <Link to="/suite/business">Business Suite</Link>
      <ChevronRightIcon size={11} color="currentColor" />
      <Link to={`/suite/business/${id}`}>{ctx?.detail?.project?.name || 'Project'}</Link>
      <ChevronRightIcon size={11} color="currentColor" />
      <span>{doc.kind}</span>
    </div>
  )

  if (doc.content?.version !== 2) {
    return (
      <>
        {crumbs}
        <LegacyDocument doc={doc} onChange={change} onRebuild={rebuild} saveState={saveState} setStatus={setStatus} />
      </>
    )
  }

  const content = doc.content
  const style = findStyle(content.style)

  return (
    <>
      {crumbs}
      <div className="doc-toolbar">
        <input
          className="suite-doc-title"
          value={doc.title}
          aria-label="Document name"
          onChange={(e) => change({ ...doc, title: e.target.value })}
        />
        <span className={`doc-save doc-save-${saveState}`} role="status">
          {saveState === 'saving' ? 'Saving…' : saveState === 'pending' ? 'Unsaved' : saveState === 'error' ? 'Not saved' : 'Saved'}
        </span>
        <select className="settings-input doc-status" value={doc.status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button type="button" className="settings-btn settings-btn-primary" onClick={() => { flush(); window.print() }}>
          Print / PDF
        </button>
      </div>

      {error && <p className="settings-error">{error}</p>}

      <div className="doc-layout">
        <aside className="doc-side">
          <section>
            <h3>Style</h3>
            <StylePicker
              compact
              doc={content}
              value={content.style}
              accent={content.accent}
              onChange={(styleId) => setContent({ ...content, style: styleId })}
            />
          </section>

          <section>
            <h3>Accent colour</h3>
            <div className="doc-accent">
              <label className="doc-accent-swatch" style={{ background: content.accent || style.colors.accent }}>
                <input
                  type="color"
                  value={content.accent || style.colors.accent}
                  onChange={(e) => setContent({ ...content, accent: e.target.value })}
                  aria-label="Accent colour"
                />
              </label>
              <span>{(content.accent || style.colors.accent).toUpperCase()}</span>
              {content.accent && (
                <button type="button" className="settings-btn settings-btn-ghost" onClick={() => setContent({ ...content, accent: null })}>
                  Use {style.name}'s
                </button>
              )}
            </div>
          </section>

          {content.kind === 'proposal' && (
            <section>
              <h3>Pages</h3>
              <div className="doc-pages">
                {PROPOSAL_PAGE_LABELS.map((p) => {
                  const on = content.show?.[p.key] !== false
                  return (
                    <label key={p.key} className="doc-page-toggle">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setContent({ ...content, show: { ...(content.show || {}), [p.key]: !on } })}
                      />
                      {p.label}
                    </label>
                  )
                })}
              </div>
            </section>
          )}

          <section>
            <h3>Content</h3>
            <p className="settings-row-desc">
              Click any text on the page to change it. Updated your studio profile or figures since? Rebuild pulls them in again.
            </p>
            <button type="button" className="settings-btn" onClick={rebuild}>
              Rebuild from project
            </button>
          </section>
        </aside>

        <div className="doc-main">
          <DocumentRenderer doc={content} editable onChange={setContent} />
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------ version 1 */

/**
 * Documents generated before the designed layouts: a flat list of editable
 * blocks. They still open and edit, and can be rebuilt into the new design.
 */
function LegacyDocument({ doc, onChange, onRebuild, saveState, setStatus }) {
  function editBlock(sectionId, blockIndex, patch) {
    onChange({
      ...doc,
      content: {
        ...doc.content,
        sections: doc.content.sections.map((s) =>
          s.id !== sectionId ? s : { ...s, blocks: s.blocks.map((b, i) => (i === blockIndex ? { ...b, ...patch } : b)) }
        ),
      },
    })
  }

  return (
    <>
      <div className="doc-upgrade">
        <div>
          <strong>This document uses the old plain layout.</strong>
          <span>Rebuild it to get the designed pages and the choice of styles. It's rebuilt from your current studio profile and project.</span>
        </div>
        <button type="button" className="settings-btn settings-btn-primary" onClick={onRebuild}>
          Rebuild in the new design
        </button>
      </div>

      <div className="doc-toolbar">
        <input
          className="suite-doc-title"
          value={doc.title}
          onChange={(e) => onChange({ ...doc, title: e.target.value })}
        />
        <span className={`doc-save doc-save-${saveState}`}>{saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : 'Unsaved'}</span>
        <select className="settings-input doc-status" value={doc.status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button type="button" className="settings-btn" onClick={() => window.print()}>Print / PDF</button>
      </div>

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
                    onChange={(e) => editBlock(section.id, i, { items: e.target.value.split('\n').filter((l) => l.trim()) })}
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
                          onChange={(e) => editBlock(section.id, i, { rows: block.rows.map((r, x) => (x === ri ? [r[0], e.target.value] : r)) })}
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
                                onChange={(e) =>
                                  editBlock(section.id, i, {
                                    rows: block.rows.map((r, x) => (x === ri ? r.map((c, y) => (y === ci ? e.target.value : c)) : r)),
                                  })
                                }
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
