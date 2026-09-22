import { useEffect, useRef, useState } from 'react'
import * as api from '../../lib/api'
import { BriefcaseIcon } from '../../components/icons'
import AdminEmpty from '../../components/admin/AdminEmpty'

const STATUS_LABEL = { new: 'New', contacted: 'Contacted', replied: 'Replied', won: 'Won', lost: 'Lost' }
const STATUSES = ['new', 'contacted', 'replied', 'won', 'lost']
const FILTERS = [{ id: '', label: 'All' }, ...STATUSES.map((s) => ({ id: s, label: STATUS_LABEL[s] }))]

function fmt(d) {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** A very small CSV reader: header row + comma-separated fields, no quoting edge cases. */
function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim())
  if (!lines.length) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim())
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] || '']))
  })
}

export default function AdminLeadsPage() {
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [leads, setLeads] = useState(null)
  const [counts, setCounts] = useState({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState(() => new Set())

  const [addForm, setAddForm] = useState({ email: '', name: '', company: '', source: '' })
  const [addBusy, setAddBusy] = useState(false)
  const fileRef = useRef(null)

  const [composeFor, setComposeFor] = useState(null) // 'selected' | leadId | null
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  async function load() {
    try {
      const { leads: rows, counts: c } = await api.fetchAdminLeads({ status: status || undefined, q: q.trim() || undefined })
      setLeads(rows)
      setCounts(c)
    } catch (err) {
      setError(err.message)
      setLeads([])
    }
  }

  useEffect(() => {
    load()
  }, [status])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function addLead(e) {
    e.preventDefault()
    if (!addForm.email.trim()) return
    setAddBusy(true)
    setError('')
    try {
      await api.addAdminLead(addForm)
      setAddForm({ email: '', name: '', company: '', source: '' })
      setNotice('Lead added.')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setAddBusy(false)
    }
  }

  function importFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const rows = parseCsv(String(reader.result || ''))
      if (!rows.length) return setError('That file has no rows Routicle could read.')
      try {
        const { added, skipped } = await api.importAdminLeads(rows)
        setNotice(`Imported ${added} lead${added === 1 ? '' : 's'}${skipped ? `, skipped ${skipped}` : ''}.`)
        await load()
      } catch (err) {
        setError(err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function setLeadStatus(lead, next) {
    try {
      await api.patchAdminLead({ id: lead.id, status: next })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove(lead) {
    if (!window.confirm(`Remove ${lead.email} from leads?`)) return
    try {
      await api.deleteAdminLead(lead.id)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  function openCompose(target) {
    setComposeFor(target)
    setSubject('')
    setBody('')
    setError('')
  }

  async function send() {
    if (subject.trim().length < 3 || body.trim().length < 10) return setError('Write a subject and a message.')
    setSending(true)
    setError('')
    try {
      const args =
        composeFor === 'selected'
          ? { leadIds: [...selected], subject: subject.trim(), body: body.trim() }
          : { leadId: composeFor, subject: subject.trim(), body: body.trim() }
      const { sent, attempted } = await api.sendAdminLeadOutreach(args)
      setNotice(`Sent to ${sent} of ${attempted}.`)
      setComposeFor(null)
      setSelected(new Set())
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const composeTarget = composeFor === 'selected' ? `${selected.size} selected lead${selected.size === 1 ? '' : 's'}` : leads?.find((l) => l.id === composeFor)?.email

  return (
    <section className="admin-section">
      <header className="adm-page-head">
        <h2>Leads</h2>
        <p>
          A prospect list you build here, kept apart from account emails. Nobody who only signed up as a subscriber or
          creator gets mailed from this page. Every message carries a working unsubscribe link.
        </p>
      </header>

      <div className="adm-kpis">
        {STATUSES.map((s) => (
          <div key={s} className="adm-kpi"><strong>{counts[s] ?? '–'}</strong><span>{STATUS_LABEL[s]}</span></div>
        ))}
      </div>

      <form className="admin-form adm-lead-add" onSubmit={addLead}>
        <div className="admin-form-row">
          <label className="settings-field">
            <span className="settings-field-label">Email</span>
            <input className="settings-input" placeholder="lead@company.com" type="email" required value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} />
          </label>
          <label className="settings-field">
            <span className="settings-field-label">Name</span>
            <input className="settings-input" placeholder="Full name" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
          </label>
          <label className="settings-field">
            <span className="settings-field-label">Company</span>
            <input className="settings-input" placeholder="Company" value={addForm.company} onChange={(e) => setAddForm((f) => ({ ...f, company: e.target.value }))} />
          </label>
          <label className="settings-field">
            <span className="settings-field-label">Source</span>
            <input className="settings-input" placeholder="e.g. LinkedIn" value={addForm.source} onChange={(e) => setAddForm((f) => ({ ...f, source: e.target.value }))} />
          </label>
        </div>
        <div className="adm-lead-add-actions">
          <button type="submit" className="settings-btn" disabled={addBusy}>{addBusy ? 'Adding…' : 'Add lead'}</button>
          <button type="button" className="settings-btn settings-btn-ghost" onClick={() => fileRef.current?.click()}>Import CSV…</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={importFile} />
          <span className="settings-field-hint">Header row: email, name, company, source</span>
        </div>
      </form>

      {error && <p className="settings-error">{error}</p>}
      {notice && <p className="settings-notice">{notice}</p>}

      <div className="adm-filter-row">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className={status === f.id ? 'adm-filter adm-filter-on' : 'adm-filter'} onClick={() => setStatus(f.id)}>{f.label}</button>
        ))}
      </div>
      <div className="adm-lead-toolbar">
        <label className="adm-search">
          <input type="search" value={q} placeholder="Search by email, name or company" onChange={(e) => setQ(e.target.value)} />
        </label>
        {selected.size > 0 && (
          <button type="button" className="btn-hero-primary" onClick={() => openCompose('selected')}>
            Email {selected.size} selected…
          </button>
        )}
      </div>

      {leads === null ? (
        <p className="explore-empty">Loading…</p>
      ) : leads.length === 0 ? (
        <AdminEmpty icon={BriefcaseIcon} title="No leads yet">
          Add one above, or import a CSV of prospects to start reaching out.
        </AdminEmpty>
      ) : (
        <ul className="adm-people">
          {leads.map((l) => (
            <li key={l.id} className="adm-person">
              <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} aria-label={`Select ${l.email}`} />
              <div className="adm-person-main">
                <span className="adm-person-name">{l.name || l.email}{l.company ? ` · ${l.company}` : ''}</span>
                <span className="adm-person-meta">
                  {l.email} · {l.source || 'no source'} · added {fmt(l.createdAt)}
                  {l.unsubscribed && ' · unsubscribed'}
                </span>
              </div>
              <select className="adm-select" value={l.status} onChange={(e) => setLeadStatus(l, e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
              <button type="button" className="settings-btn" disabled={l.unsubscribed} onClick={() => openCompose(l.id)}>Email</button>
              <button type="button" className="settings-btn settings-btn-danger" onClick={() => remove(l)}>Remove</button>
            </li>
          ))}
        </ul>
      )}

      {composeFor && (
        <div className="adm-modal-backdrop" onClick={() => setComposeFor(null)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Email {composeTarget}</h3>
            <label className="settings-field">
              <span className="settings-field-label">Subject</span>
              <input className="settings-input" value={subject} maxLength={160} onChange={(e) => setSubject(e.target.value)} />
            </label>
            <label className="settings-field">
              <span className="settings-field-label">Message</span>
              <textarea className="settings-textarea" rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder={'# heading\n\nplain text, **bold**, [links](https://…)'} />
            </label>
            {error && <p className="settings-error">{error}</p>}
            <div className="adm-modal-actions">
              <button type="button" className="settings-btn settings-btn-ghost" onClick={() => setComposeFor(null)}>Cancel</button>
              <button type="button" className="btn-hero-primary" disabled={sending} onClick={send}>{sending ? 'Sending…' : 'Send'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
