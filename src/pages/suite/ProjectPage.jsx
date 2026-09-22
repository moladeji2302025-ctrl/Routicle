import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from '../../lib/api'
import { QUESTION_GROUPS, findQuestion, STARTER_QUESTION_IDS } from '../../data/discoveryQuestions'
import { buildDocument, answersByMeaning, DOCUMENT_KINDS, readiness } from '../../data/documentTemplates'
import { findStyle } from '../../data/documentStyles'
import PackagesEditor from './PackagesEditor'
import StylePicker, { rememberedStyle } from '../../components/docs/StylePicker'
import { ChevronRightIcon, PlusIcon } from '../../components/icons'

const TABS = [
  { id: 'form', label: 'Discovery form' },
  { id: 'responses', label: 'Responses' },
  { id: 'figures', label: 'Figures' },
  { id: 'documents', label: 'Documents' },
  { id: 'schedule', label: 'Schedule' },
]

function monthsFrom(startISO, count = 12) {
  const out = []
  const d = startISO ? new Date(startISO) : new Date()
  d.setDate(1)
  for (let i = 0; i < count; i += 1) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d.setMonth(d.getMonth() + 1)
  }
  return out
}

const monthLabel = (period) => {
  const [y, m] = period.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export default function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tab, setTab] = useState('form')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const [detail, { profile: p }] = await Promise.all([api.fetchProject(id), api.fetchStudioProfile()])
      setData(detail)
      setProfile(p)
    } catch (err) {
      setError(err.message)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const selectedIds = useMemo(() => (data?.form?.questions || []).map((q) => q.id), [data])

  async function run(key, fn, msg) {
    setBusy(key)
    setError('')
    setNotice('')
    try {
      await fn()
      await load()
      if (msg) setNotice(msg)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  function saveQuestions(ids) {
    const questions = ids.map((qid) => {
      const q = findQuestion(qid)
      return { id: q.id, text: q.text, type: q.type, maps: q.maps }
    })
    return api.saveProjectForm(id, { questions })
  }

  function toggleQuestion(qid) {
    const next = selectedIds.includes(qid) ? selectedIds.filter((x) => x !== qid) : [...selectedIds, qid]
    run(`q-${qid}`, () => saveQuestions(next))
  }

  /**
   * Generation is a pure merge of the studio profile, the project and the
   * client's own answers into a fixed template — no model call, so it costs
   * nothing and always produces the same document from the same inputs.
   */
  const draft = useCallback(
    (kind, style, accent) => {
      const latest = data.submissions[0]
      const a = latest ? answersByMeaning(latest.answers, data.form?.questions || []) : {}
      const figures = data.project.figures || { packages: [], lines: [] }
      return buildDocument(kind, {
        studio: profile || {},
        project: data.project,
        a,
        packages: figures.packages || [],
        lines: figures.lines || [],
        invoiceNumber: String(data.documents.filter((d) => d.kind === 'invoice').length + 1).padStart(4, '0'),
        style,
        accent,
      })
    },
    [data, profile]
  )

  // The document is created and opened in one step: there is nothing to do
  // with a new proposal except look at it.
  async function createDocument(kind, style, accent) {
    setBusy(`gen-${kind}`)
    setError('')
    try {
      const content = draft(kind, style, accent)
      const client = data.project.clientCompany || data.project.clientName || data.project.name
      const label = DOCUMENT_KINDS.find((k) => k.id === kind)?.label || kind
      const { document } = await api.saveDocument({ projectId: id, kind, title: `${label} for ${client}`, content })
      navigate(`/suite/business/${id}/doc/${document.id}`)
    } catch (err) {
      setError(err.message)
      setBusy('')
    }
  }

  if (error && !data) return <p className="settings-error">{error}</p>
  if (!data) return <p className="explore-empty">Loading project…</p>

  const { project, form, documents, submissions, schedule } = data
  const shareUrl = form ? `${window.location.origin}/f/${form.shareSlug}` : ''
  const recurring = project.billingType === 'recurring'

  return (
    <>
      <div className="suite-crumbs">
        <Link to="/suite/business">Business Suite</Link>
        <ChevronRightIcon size={11} color="currentColor" />
        <span>{project.name}</span>
      </div>

      <div className="suite-section-head">
        <div>
          <h2>
            {project.name}
            <span className={`suite-pill suite-pill-${project.billingType}`}>
              {recurring ? 'Recurring' : 'One-time'}
            </span>
          </h2>
          <p className="settings-section-desc">
            {project.clientCompany || project.clientName || 'No client contact yet'}
            {project.clientEmail ? ` · ${project.clientEmail}` : ''}
          </p>
        </div>
        <button
          type="button"
          className="settings-btn"
          onClick={() =>
            run('billing', () =>
              api.patchProject(id, { billingType: recurring ? 'one_time' : 'recurring' })
            )
          }
        >
          Switch to {recurring ? 'one-time' : 'recurring'}
        </button>
      </div>

      <nav className="suite-subtabs">
        {TABS.filter((t) => t.id !== 'schedule' || recurring).map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'suite-subtab suite-subtab-active' : 'suite-subtab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'responses' && submissions.length > 0 && <span className="suite-count">{submissions.length}</span>}
            {t.id === 'documents' && documents.length > 0 && <span className="suite-count">{documents.length}</span>}
          </button>
        ))}
      </nav>

      {error && <p className="settings-error">{error}</p>}
      {notice && <p className="settings-notice">{notice}</p>}

      {/* ---------------------------------------------------------- form */}
      {tab === 'form' && (
        <>
          <div className="suite-form-bar">
            <div>
              <strong>{selectedIds.length} question{selectedIds.length === 1 ? '' : 's'} selected</strong>
              <span className="settings-row-desc">
                Only pick what's relevant to this project. There are more questions here than any one form needs.
              </span>
            </div>
            <div className="settings-inline-actions">
              {selectedIds.length === 0 && (
                <button
                  type="button"
                  className="settings-btn"
                  onClick={() => run('starter', () => saveQuestions(STARTER_QUESTION_IDS), 'Starter questions added.')}
                >
                  Use the starter five
                </button>
              )}
              <button
                type="button"
                className="settings-btn settings-btn-primary"
                disabled={selectedIds.length === 0 || busy === 'open'}
                onClick={() =>
                  run('open', () => api.saveProjectForm(id, { status: form.status === 'open' ? 'closed' : 'open' }))
                }
              >
                {form?.status === 'open' ? 'Close form' : 'Open for responses'}
              </button>
            </div>
          </div>

          {form?.status === 'open' && (
            <div className="suite-share">
              <span className="settings-stack-label">Client link</span>
              <div className="settings-inline-form">
                <input type="text" className="settings-input" value={shareUrl} readOnly />
                <button
                  type="button"
                  className="settings-btn"
                  onClick={() => navigator.clipboard?.writeText(shareUrl).then(() => setNotice('Link copied.'))}
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {QUESTION_GROUPS.map((group) => (
            <section key={group.id} className="suite-qgroup">
              <div className="suite-qgroup-head">
                <h3>{group.label}</h3>
                <p>{group.blurb}</p>
              </div>
              <div className="suite-qlist">
                {group.questions.map((q) => {
                  const on = selectedIds.includes(q.id)
                  return (
                    <button
                      key={q.id}
                      type="button"
                      className={on ? 'suite-q suite-q-on' : 'suite-q'}
                      onClick={() => toggleQuestion(q.id)}
                      disabled={busy === `q-${q.id}`}
                    >
                      <span className="suite-q-mark">{on ? '−' : <PlusIcon size={12} color="currentColor" />}</span>
                      {q.text}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </>
      )}

      {/* ----------------------------------------------------- responses */}
      {tab === 'responses' && (
        submissions.length === 0 ? (
          <div className="page-empty-state">
            <h2>No responses yet</h2>
            <p>Open the form and send the link to your client. Their answers land here and feed the documents.</p>
          </div>
        ) : (
          submissions.map((s) => (
            <section key={s.id} className="suite-response">
              <div className="suite-response-head">
                <strong>{s.respondentName || 'Client'}</strong>
                <span>{new Date(s.submittedAt).toLocaleString()}</span>
              </div>
              {(form?.questions || []).map((q) => (
                <div key={q.id} className="suite-answer">
                  <span className="suite-answer-q">{q.text}</span>
                  <p>{s.answers?.[q.id] || <em>No answer</em>}</p>
                </div>
              ))}
            </section>
          ))
        )
      )}

      {tab === 'figures' && (
        <PackagesEditor
          packages={project.figures?.packages || []}
          lines={project.figures?.lines || []}
          currency={project.currency}
          saving={busy === 'figures'}
          onChange={(figures) => run('figures', () => api.patchProject(id, { figures }), 'Figures saved.')}
        />
      )}

      {/* ----------------------------------------------------- documents */}
      {tab === 'documents' && (
        <>
          <NewDocument
            project={project}
            profile={profile}
            submissions={submissions}
            busy={busy}
            draft={draft}
            onCreate={createDocument}
            onGoTab={setTab}
          />

          {documents.length === 0 ? (
            <p className="explore-empty">Nothing generated yet.</p>
          ) : (
            <div className="download-list">
              {documents.map((d) => (
                <div key={d.id} className="download-row">
                  <span className={`update-tag update-tag-${d.kind === 'invoice' ? 'fix' : 'feature'}`}>{d.kind}</span>
                  {d.content?.version === 2 && (
                    <span
                      className="doc-row-swatch"
                      title={findStyle(d.content.style).name}
                      style={{ background: d.content.accent || findStyle(d.content.style).colors.accent }}
                    />
                  )}
                  <div className="download-info">
                    <span className="download-title">{d.title}</span>
                    <span className="download-meta">
                      {d.status} · {new Date(d.updatedAt).toLocaleDateString()}
                      {d.period ? ` · ${d.period}` : ''}
                    </span>
                  </div>
                  <Link to={`/suite/business/${id}/doc/${d.id}`} className="settings-btn">Open</Link>
                  <button
                    type="button"
                    className="settings-btn settings-btn-danger"
                    onClick={() => run(`del-${d.id}`, () => api.deleteDocument(d.id))}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------ schedule */}
      {tab === 'schedule' && recurring && (
        <>
          <p className="settings-section-desc" style={{ marginBottom: 18 }}>
            Pick what goes out each month. A retainer rarely needs a new proposal every month. Usually it's an invoice, and sometimes a brief.
          </p>
          <div className="suite-months">
            {monthsFrom(project.startDate).map((period) => {
              const row = schedule.find((s) => s.period === period)
              const kinds = row?.docKinds || []
              return (
                <div key={period} className={kinds.length ? 'suite-month suite-month-on' : 'suite-month'}>
                  <span className="suite-month-label">{monthLabel(period)}</span>
                  <div className="suite-month-kinds">
                    {DOCUMENT_KINDS.map((k) => {
                      const on = kinds.includes(k.id)
                      return (
                        <button
                          key={k.id}
                          type="button"
                          className={on ? 'suite-chip suite-chip-on' : 'suite-chip'}
                          onClick={() =>
                            run(`s-${period}-${k.id}`, () =>
                              api.saveSchedule(id, {
                                period,
                                docKinds: on ? kinds.filter((x) => x !== k.id) : [...kinds, k.id],
                              })
                            )
                          }
                        >
                          {k.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

/**
 * Choosing what to make and how it should look, before anything is saved.
 *
 * The checks say what the document will be missing and link straight to where
 * to fix it; none of them block. The style thumbnails are real covers built
 * from this project, so the choice is made by looking rather than by name.
 */
function NewDocument({ project, profile, submissions, busy, draft, onCreate, onGoTab }) {
  const [kind, setKind] = useState('proposal')
  const [style, setStyle] = useState(() => rememberedStyle('proposal'))
  const [accent, setAccent] = useState(null)

  // Switching kind (Proposal/Contract/Brief/Invoice) can leave the picked
  // style invalid — Invoice's own layouts don't apply to a Contract, say.
  // Fall back to whatever was last picked for the newly chosen kind.
  useEffect(() => {
    const current = findStyle(style)
    if (current.kinds && !current.kinds.includes(kind)) setStyle(rememberedStyle(kind))
  }, [kind])

  const preview = useMemo(() => draft(kind, style, accent), [draft, kind, style, accent])
  const checks = readiness(kind, { profile, project, submissions, figures: project.figures })
  const missing = checks.filter((c) => !c.ok).length
  const creating = busy === `gen-${kind}`
  const label = DOCUMENT_KINDS.find((k) => k.id === kind)?.label
  const shownAccent = accent || findStyle(style).colors.accent

  return (
    <section className="doc-new">
      <div className="doc-new-kinds" role="tablist" aria-label="Document type">
        {DOCUMENT_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="tab"
            aria-selected={kind === k.id}
            className={kind === k.id ? 'suite-doc-new suite-doc-new-on' : 'suite-doc-new'}
            onClick={() => setKind(k.id)}
          >
            <strong>{k.label}</strong>
            <span>{k.blurb}</span>
          </button>
        ))}
      </div>

      <div className="doc-new-body">
        <div className="doc-new-pick">
          <div className="doc-new-head">
            <h3>Pick a style</h3>
            <div className="doc-accent">
              <label className="doc-accent-swatch" style={{ background: shownAccent }}>
                <input type="color" value={shownAccent} onChange={(e) => setAccent(e.target.value)} aria-label="Accent colour" />
              </label>
              <span>{accent ? 'Your colour' : 'Style colour'}</span>
              {accent && (
                <button type="button" className="settings-btn settings-btn-ghost" onClick={() => setAccent(null)}>
                  Reset
                </button>
              )}
            </div>
          </div>
          <StylePicker doc={preview} value={style} accent={accent} onChange={setStyle} />
        </div>

        <aside className="doc-new-side">
          <h3>Before you create</h3>
          <ul className="doc-checks">
            {checks.map((c) => (
              <li key={c.label} className={c.ok ? 'doc-check doc-check-ok' : 'doc-check'}>
                <span className="doc-check-dot" aria-hidden="true">{c.ok ? '✓' : '!'}</span>
                <div>
                  <strong>{c.label}</strong>
                  {!c.ok && (
                    <span>
                      {c.fix}
                      {c.to && (
                        <>
                          {' '}
                          <Link to={c.to}>Fix</Link>
                        </>
                      )}
                      {c.tab && (
                        <>
                          {' '}
                          <button type="button" className="doc-check-link" onClick={() => onGoTab(c.tab)}>
                            Fix
                          </button>
                        </>
                      )}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="settings-btn settings-btn-primary doc-new-go"
            disabled={creating}
            onClick={() => onCreate(kind, style, accent)}
          >
            {creating ? 'Creating…' : `Create ${String(label).toLowerCase()}`}
          </button>
          <p className="settings-row-desc">
            {missing === 0
              ? 'Everything it needs is here.'
              : 'You can create it now and fill the gaps on the page. Every word is editable.'}
          </p>
        </aside>
      </div>
    </section>
  )
}
