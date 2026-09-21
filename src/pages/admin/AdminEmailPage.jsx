import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as api from '../../lib/api'

const TABS = [
  { id: 'status', label: 'Setup' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'log', label: 'Sent mail' },
  { id: 'suppressed', label: 'Suppressed' },
]

const STATUS_FILTERS = ['', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'skipped', 'suppressed']

const dateTime = (v) => (v ? new Date(v).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')

/**
 * The email console: is sending set up, what went out, who we must not mail,
 * and the newsletter. Nothing here shows a secret; it only reports whether one
 * is set.
 */
export default function AdminEmailPage() {
  const [tab, setTab] = useState('status')
  return (
    <section className="admin-section">
      <h2>Email</h2>
      <p className="settings-section-desc">
        Everything Routicle sends by email goes through Resend. Check it is set up, see what was sent and what bounced, and send the newsletter.
      </p>

      <nav className="suite-subtabs" aria-label="Email sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? 'suite-subtab suite-subtab-active' : 'suite-subtab'} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'status' && <SetupTab />}
      {tab === 'newsletter' && <NewsletterTab />}
      {tab === 'log' && <LogTab />}
      {tab === 'suppressed' && <SuppressedTab />}
    </section>
  )
}

/* ------------------------------------------------------------------ setup */

function Check({ ok, warn, title, children }) {
  const state = ok ? 'ok' : warn ? 'warn' : 'bad'
  return (
    <li className={`em-check em-check-${state}`}>
      <span className="em-check-dot" aria-hidden="true">{ok ? '✓' : warn ? '!' : '×'}</span>
      <div>
        <strong>{title}</strong>
        <span>{children}</span>
      </div>
    </li>
  )
}

function SetupTab() {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [to, setTo] = useState('')
  const [template, setTemplate] = useState('')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    api
      .fetchAdminEmailStatus()
      .then(setStatus)
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!template) {
      setPreview(null)
      return
    }
    api.fetchAdminTemplatePreview(template).then(setPreview).catch(() => setPreview(null))
  }, [template])

  async function sendTest() {
    setBusy(true)
    setResult(null)
    try {
      setResult(await api.sendAdminTestEmail({ to: to.trim() || undefined, template: template || undefined }))
    } catch (err) {
      setResult({ ok: false, error: err.message })
    } finally {
      setBusy(false)
    }
  }

  if (error) return <p className="settings-error">{error}</p>
  if (!status) return <p className="explore-empty">Checking…</p>

  const webhookUrl = `${window.location.origin}/api/email/webhook`
  const domain = status.domainStatus
  const domainOk = domain?.checked && domain.match?.status === 'verified'

  return (
    <>
      <ul className="em-checks">
        <Check ok={status.configured && status.transport === 'Resend'} warn={status.configured} title={status.transport === 'SMTP' ? 'Sending through SMTP, not Resend' : 'Resend API key'}>
          {status.transport === 'Resend'
            ? 'RESEND_API_KEY is set.'
            : status.transport === 'SMTP'
              ? 'Mail is going out over SMTP. Set RESEND_API_KEY in Vercel and redeploy to switch to Resend.'
              : 'No mail can be sent. Create a key at resend.com/api-keys, add it as RESEND_API_KEY in Vercel, and redeploy.'}
        </Check>

        <Check ok={!status.usingSharedSender && status.env.MAIL_FROM} warn={status.usingSharedSender && status.configured} title="Sender address">
          {status.usingSharedSender
            ? `Sending as ${status.from}. This shared address only delivers to your own Resend login. Verify a domain and set MAIL_FROM to an address on it.`
            : `Sending as ${status.from}.`}
        </Check>

        <Check
          ok={domainOk}
          warn={status.usingSharedSender || (!domain?.checked && !status.usingSharedSender)}
          title={status.usingSharedSender ? 'Sending domain' : `Sending domain${status.domain ? `: ${status.domain}` : ''}`}
        >
          {status.usingSharedSender
            ? 'Not applicable until you send from your own domain.'
            : domain?.checked
              ? domain.match
                ? domain.match.status === 'verified'
                  ? 'Verified in Resend.'
                  : `Resend reports it as "${domain.match.status}". Add the DNS records shown at resend.com/domains, then wait for it to verify.`
                : `${status.domain} isn't in your Resend account. Add it at resend.com/domains.`
              : domain?.reason === 'key-cannot-list-domains'
                ? "This key can send but can't read domain status, which is fine. Check resend.com/domains yourself, or send a test below."
                : `Couldn't check with Resend${domain?.reason ? ` (${domain.reason})` : ''}.`}
        </Check>

        <Check ok={status.webhookSecretSet} warn={false} title="Bounce and complaint webhook">
          {status.webhookSecretSet
            ? 'RESEND_WEBHOOK_SECRET is set. Make sure the webhook below is added in Resend.'
            : 'Not set up. Without it, addresses that bounce or report spam keep getting mail, which damages your sending reputation. Add the webhook below in Resend, and put its signing secret in RESEND_WEBHOOK_SECRET.'}
        </Check>

        <Check ok={status.env.APP_URL} warn title="APP_URL">
          {status.env.APP_URL ? `Links in emails point to ${status.appUrl}.` : 'Not set. Links in emails fall back to routicle.vercel.app. Set it to your real address.'}
        </Check>

        <Check ok={Boolean(status.replyTo)} warn title="Reply-to address">
          {status.replyTo
            ? `Replies go to ${status.replyTo}.`
            : 'Not set. Replies go to the From address. Set MAIL_REPLY_TO to a mailbox someone reads, because the welcome email invites people to reply.'}
        </Check>
      </ul>

      <div className="em-box">
        <h3>Webhook address</h3>
        <p className="settings-row-desc">In Resend, add a webhook to this URL and tick every email event (sent, delivered, bounced, complained, delayed, failed).</p>
        <div className="settings-inline-form">
          <input className="settings-input" readOnly value={webhookUrl} onFocus={(e) => e.target.select()} />
          <button type="button" className="settings-btn" onClick={() => navigator.clipboard?.writeText(webhookUrl)}>
            Copy
          </button>
        </div>
      </div>

      <div className="em-box">
        <h3>Send a test</h3>
        <p className="settings-row-desc">
          Sends a real email so you can see it in an inbox. Pick a template to send it with sample data, or leave it blank for a plain test.
        </p>
        <div className="em-test-row">
          <input className="settings-input" type="email" placeholder="Your own address (default)" value={to} onChange={(e) => setTo(e.target.value)} />
          <select className="settings-input" value={template} onChange={(e) => setTemplate(e.target.value)}>
            <option value="">Plain test message</option>
            {status.templates.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button type="button" className="settings-btn settings-btn-primary" disabled={busy} onClick={sendTest}>
            {busy ? 'Sending…' : 'Send'}
          </button>
        </div>
        {result && (
          <p className={result.ok ? 'settings-notice' : 'settings-error'}>
            {result.ok ? `Sent to ${result.to}. Open it and check the SPF, DKIM and DMARC results ("Show original" in Gmail).` : result.error || 'That did not send.'}
          </p>
        )}
        {preview && (
          <details className="em-preview" open>
            <summary>{preview.subject}</summary>
            <pre>{preview.text}</pre>
          </details>
        )}
      </div>
    </>
  )
}

/* -------------------------------------------------------------- newsletter */

const HELP = '# A heading\n\nA paragraph with **bold** and a [link](https://routicle.vercel.app).\n\n- a bullet\n- another'

function NewsletterTab() {
  const [info, setInfo] = useState(null)
  const [subject, setSubject] = useState('')
  const [preheader, setPreheader] = useState('')
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [progress, setProgress] = useState(null)
  const stop = useRef(false)

  const load = useCallback(() => api.fetchAdminNewsletter().then(setInfo).catch((err) => setError(err.message)), [])
  useEffect(() => {
    load()
  }, [load])

  const draft = { subject, preheader, body }

  async function run(name, fn) {
    setBusy(name)
    setError('')
    setNotice('')
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  const doPreview = () => run('preview', async () => setPreview((await api.adminNewsletter('preview', draft)).text))

  const doTest = () =>
    run('test', async () => {
      const r = await api.adminNewsletter('test', draft)
      if (r.ok) setNotice(`Test sent to ${r.to}.`)
      else setError(r.error || 'The test did not send.')
    })

  const doSend = () => {
    const n = info?.counts?.audience || 0
    if (!window.confirm(`Send "${subject}" to ${n} subscriber${n === 1 ? '' : 's'}? This can't be undone.`)) return
    return run('send', async () => {
      stop.current = false
      const { id, total } = await api.adminNewsletter('create', draft)
      setProgress({ sent: 0, failed: 0, total })
      // A function can't run long enough for a big list, so the page sends it a
      // batch at a time. Closing the tab part way is safe: nobody is mailed twice.
      for (let guard = 0; guard < 500; guard += 1) {
        const r = await api.adminNewsletter('send-batch', { id })
        setProgress({ sent: r.sent, failed: r.failed, total })
        if (r.done || stop.current) break
      }
      setNotice(`Sent to ${total} subscribers.`)
      setSubject('')
      setPreheader('')
      setBody('')
      setPreview(null)
      await load()
    })
  }

  if (!info) return error ? <p className="settings-error">{error}</p> : <p className="explore-empty">Loading…</p>

  const ready = subject.trim().length >= 3 && body.trim().length >= 10
  const c = info.counts

  return (
    <>
      <div className="em-stats">
        <div><strong>{c.audience}</strong><span>will receive it</span></div>
        <div><strong>{c.pending}</strong><span>haven't confirmed</span></div>
        <div><strong>{c.unsubscribed}</strong><span>unsubscribed</span></div>
      </div>

      {!info.configured && <p className="settings-error">Email isn't configured, so nothing can be sent yet. See Setup.</p>}
      {info.configured && <p className="settings-row-desc">Sends from {info.from}. Only people who confirmed their address are included, and anyone who bounced or reported spam is skipped.</p>}

      <div className="em-box">
        <label className="settings-stack-field">
          <span className="settings-stack-label">Subject</span>
          <input className="settings-input" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} placeholder="New work this week" />
        </label>
        <label className="settings-stack-field">
          <span className="settings-stack-label">Preview text (optional)</span>
          <input className="settings-input" value={preheader} maxLength={140} onChange={(e) => setPreheader(e.target.value)} placeholder="The short line shown beside the subject in an inbox" />
        </label>
        <label className="settings-stack-field">
          <span className="settings-stack-label">Message</span>
          <textarea className="settings-input em-body" rows={12} value={body} onChange={(e) => setBody(e.target.value)} placeholder={HELP} />
          <span className="settings-stack-hint">
            <code># Heading</code> · <code>**bold**</code> · <code>[text](https://…)</code> · <code>- bullet</code> · a blank line starts a new paragraph. Every email gets an unsubscribe link automatically.
          </span>
        </label>

        {error && <p className="settings-error">{error}</p>}
        {notice && <p className="settings-notice">{notice}</p>}

        <div className="settings-inline-actions">
          <button type="button" className="settings-btn" disabled={!ready || Boolean(busy)} onClick={doPreview}>Preview text</button>
          <button type="button" className="settings-btn" disabled={!ready || Boolean(busy)} onClick={doTest}>{busy === 'test' ? 'Sending…' : 'Send test to me'}</button>
          <button type="button" className="settings-btn settings-btn-primary" disabled={!ready || Boolean(busy) || !info.configured || c.audience === 0} onClick={doSend}>
            {busy === 'send' ? 'Sending…' : `Send to ${c.audience}`}
          </button>
        </div>

        {progress && busy === 'send' && (
          <div className="em-progress" role="status">
            <div className="em-progress-bar"><span style={{ width: `${Math.min(100, ((progress.sent + progress.failed) / Math.max(1, progress.total)) * 100)}%` }} /></div>
            <span>{progress.sent} of {progress.total} sent{progress.failed ? `, ${progress.failed} failed` : ''}. Keep this page open.</span>
          </div>
        )}

        {preview && (
          <details className="em-preview" open>
            <summary>Text version</summary>
            <pre>{preview}</pre>
          </details>
        )}
      </div>

      {info.history.length > 0 && (
        <>
          <h3 className="em-h3">Sent so far</h3>
          <div className="download-list">
            {info.history.map((h) => (
              <div key={h.id} className="download-row">
                <div className="download-info">
                  <span className="download-title">{h.subject}</span>
                  <span className="download-meta">{dateTime(h.createdAt)} · {h.sent} sent{h.failed ? ` · ${h.failed} failed` : ''}</span>
                </div>
                <span className={`admin-status admin-status-${h.status === 'sent' ? 'approved' : 'pending'}`}>{h.status}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

/* -------------------------------------------------------------------- log */

function LogTab() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .fetchAdminEmailLog({ status, q: q.trim() })
        .then(setData)
        .catch((err) => setError(err.message))
    }, 250)
    return () => clearTimeout(t)
  }, [status, q])

  const counts = data?.counts || {}
  const summary = useMemo(
    () => ['sent', 'delivered', 'bounced', 'complained', 'failed', 'skipped', 'suppressed'].filter((s) => counts[s]).map((s) => `${counts[s]} ${s}`).join(' · '),
    [counts]
  )

  return (
    <>
      {summary && <p className="settings-row-desc">Last 7 days: {summary}</p>}
      <div className="projects-toolbar">
        <div className="explore-chip-row" style={{ padding: 0, margin: 0 }}>
          {STATUS_FILTERS.map((s) => (
            <button key={s || 'all'} type="button" className={status === s ? 'explore-chip explore-chip-active' : 'explore-chip'} onClick={() => setStatus(s)}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <input type="search" className="settings-input" style={{ maxWidth: 260 }} placeholder="Address or subject…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error && <p className="settings-error">{error}</p>}
      {!data ? (
        <p className="explore-empty">Loading…</p>
      ) : data.rows.length === 0 ? (
        <p className="explore-empty">Nothing yet.</p>
      ) : (
        <div className="download-list">
          {data.rows.map((r) => (
            <div key={r.id} className="download-row em-log-row">
              <div className="download-info">
                <span className="download-title">{r.subject || r.template || '(no subject)'}</span>
                <span className="download-meta">
                  {r.to} · {r.template || r.category} · {dateTime(r.createdAt)}
                  {r.error ? ` · ${r.error}` : ''}
                </span>
              </div>
              <span className={`em-status em-status-${r.status}`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------- suppressed */

function SuppressedTab() {
  const [rows, setRows] = useState(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => api.fetchAdminSuppressions().then((r) => setRows(r.rows)).catch((err) => setError(err.message)), [])
  useEffect(() => {
    load()
  }, [load])

  async function add(e) {
    e.preventDefault()
    setError('')
    try {
      await api.suppressEmailAddress(email.trim())
      setEmail('')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove(address) {
    if (!window.confirm(`Allow email to ${address} again? Only do this if the address is now valid.`)) return
    try {
      await api.unsuppressEmailAddress(address)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <p className="settings-row-desc">
        Addresses we won't send to. A permanent bounce or a spam report adds one automatically. Mailing these again is what damages a sending domain's reputation.
      </p>
      <form className="settings-inline-form" onSubmit={add}>
        <input className="settings-input" type="email" required placeholder="Add an address to block" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" className="settings-btn">Block</button>
      </form>
      {error && <p className="settings-error">{error}</p>}
      {!rows ? (
        <p className="explore-empty">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="explore-empty">No suppressed addresses.</p>
      ) : (
        <div className="download-list">
          {rows.map((r) => (
            <div key={r.email} className="download-row">
              <div className="download-info">
                <span className="download-title">{r.email}</span>
                <span className="download-meta">{r.reason}{r.detail ? ` · ${r.detail}` : ''} · {dateTime(r.createdAt)}</span>
              </div>
              <button type="button" className="settings-btn" onClick={() => remove(r.email)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
