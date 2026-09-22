import { useEffect, useState } from 'react'
import * as api from '../../lib/api'

const STATUS_LABEL = { open: 'Open', pending: 'Waiting on us', closed: 'Closed' }
const CATEGORY_LABEL = { general: 'General', complaint: 'Complaint', billing: 'Billing', creator: 'Creator', press: 'Press' }
const FILTERS = [
  { id: '', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'pending', label: 'Waiting on us' },
  { id: 'closed', label: 'Closed' },
]

function fmt(d) {
  return new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** The customer care inbox: every Contact-form submission, as a ticket. */
export default function AdminSupportPage() {
  const [status, setStatus] = useState('open')
  const [q, setQ] = useState('')
  const [tickets, setTickets] = useState(null)
  const [counts, setCounts] = useState({})
  const [error, setError] = useState('')

  const [openId, setOpenId] = useState(null)
  const [thread, setThread] = useState(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const { tickets: rows, counts: c } = await api.fetchAdminSupport({ status: status || undefined, q: q.trim() || undefined })
      setTickets(rows)
      setCounts(c)
    } catch (err) {
      setError(err.message)
      setTickets([])
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

  async function openTicket(id) {
    setOpenId(id)
    setThread(null)
    setReply('')
    try {
      const data = await api.fetchAdminSupportTicket(id)
      setThread(data)
    } catch (err) {
      setError(err.message)
    }
  }

  async function send() {
    if (!reply.trim()) return
    setBusy(true)
    setError('')
    try {
      await api.replyAdminSupport(openId, reply.trim())
      setReply('')
      await openTicket(openId)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function setTicketStatus(id, next) {
    try {
      await api.patchAdminSupport({ id, status: next })
      if (thread?.ticket.id === id) setThread((t) => ({ ...t, ticket: { ...t.ticket, status: next } }))
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="admin-section">
      <header className="adm-page-head">
        <h2>Customer care</h2>
        <p>Every message from the Contact page, as a ticket. A reply here is sent by email and logged.</p>
      </header>

      <div className="adm-kpis">
        <div className="adm-kpi"><strong>{counts.open ?? '–'}</strong><span>Open</span></div>
        <div className="adm-kpi"><strong>{counts.pending ?? '–'}</strong><span>Waiting on us</span></div>
        <div className="adm-kpi"><strong>{counts.closed ?? '–'}</strong><span>Closed</span></div>
      </div>

      <div className="adm-support">
        <div className="adm-support-list">
          <div className="adm-filter-row">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className={status === f.id ? 'adm-filter adm-filter-on' : 'adm-filter'} onClick={() => setStatus(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <label className="adm-search">
            <input type="search" value={q} placeholder="Search by email or subject" onChange={(e) => setQ(e.target.value)} />
          </label>

          {error && <p className="settings-error">{error}</p>}

          {tickets === null ? (
            <p className="explore-empty">Loading…</p>
          ) : tickets.length === 0 ? (
            <p className="explore-empty">Nothing here.</p>
          ) : (
            <ul className="adm-tickets">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button type="button" className={t.id === openId ? 'adm-ticket adm-ticket-on' : 'adm-ticket'} onClick={() => openTicket(t.id)}>
                    <span className="adm-ticket-top">
                      <span className="adm-ticket-subject">{t.subject}</span>
                      <span className={`adm-status adm-status-${t.status}`}>{STATUS_LABEL[t.status]}</span>
                    </span>
                    <span className="adm-ticket-meta">{t.email} · {CATEGORY_LABEL[t.category]} · {fmt(t.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="adm-support-thread">
          {!thread ? (
            <p className="explore-empty">Pick a ticket to read it.</p>
          ) : (
            <>
              <header className="adm-thread-head">
                <div>
                  <h3>{thread.ticket.subject}</h3>
                  <p>{thread.ticket.name ? `${thread.ticket.name} · ` : ''}{thread.ticket.email}</p>
                </div>
                <div className="adm-thread-actions">
                  {thread.ticket.status !== 'closed' ? (
                    <button type="button" className="settings-btn" onClick={() => setTicketStatus(thread.ticket.id, 'closed')}>Close</button>
                  ) : (
                    <button type="button" className="settings-btn" onClick={() => setTicketStatus(thread.ticket.id, 'open')}>Reopen</button>
                  )}
                </div>
              </header>

              <div className="adm-thread-body">
                {thread.messages.map((m) => (
                  <div key={m.id} className={`adm-msg adm-msg-${m.direction}`}>
                    <span className="adm-msg-meta">{m.direction === 'in' ? m.author : `You · ${m.author}`} · {fmt(m.at)}</span>
                    <p>{m.body}</p>
                  </div>
                ))}
              </div>

              <div className="adm-reply">
                <textarea rows={3} value={reply} placeholder="Write a reply…" onChange={(e) => setReply(e.target.value)} />
                <button type="button" className="btn-hero-primary" disabled={busy || !reply.trim()} onClick={send}>
                  {busy ? 'Sending…' : 'Send reply'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
