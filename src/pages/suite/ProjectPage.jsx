import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../../lib/api'
import { QUESTION_GROUPS, findQuestion, STARTER_QUESTION_IDS } from '../../data/discoveryQuestions'
import { buildDocument, answersByMeaning, DOCUMENT_KINDS } from '../../data/documentTemplates'
import PackagesEditor from './PackagesEditor'
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
  async function generate(kind) {
    if (!profile) {
      setError('Set up your studio profile first — the documents are built from it.')
      return
    }
    const latest = data.submissions[0]
    const a = latest ? answersByMeaning(latest.answers, data.form?.questions || []) : {}
    const figures = data.project.figures || { packages: [], lines: [] }
    const content = buildDocument(kind, {
      studio: profile,
      project: data.project,
      a,
      packages: figures.packages || [],
      lines: figures.lines || [],
      invoiceNumber: String(data.documents.filter((d) => d.kind === 'invoice').length + 1).padStart(4, '0'),
    })
    await run(`gen-${kind}`, () => api.saveDocument({ projectId: id, kind, title: content.title, content }), `${kind} generated.`)
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
                Pick only what's relevant to this project — the bank is deliberately larger than any one form should be.
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
          <div className="suite-doc-actions">
            {DOCUMENT_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                className="suite-doc-new"
                onClick={() => generate(k.id)}
                disabled={busy === `gen-${k.id}`}
              >
                <strong>{busy === `gen-${k.id}` ? 'Generating…' : k.label}</strong>
                <span>{k.blurb}</span>
              </button>
            ))}
          </div>

          {documents.length === 0 ? (
            <p className="explore-empty">Nothing generated yet.</p>
          ) : (
            <div className="download-list">
              {documents.map((d) => (
                <div key={d.id} className="download-row">
                  <span className={`update-tag update-tag-${d.kind === 'invoice' ? 'fix' : 'feature'}`}>{d.kind}</span>
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
            Pick what goes out each month. A retainer rarely needs a new proposal every cycle — usually it's an
            invoice, sometimes a brief.
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
