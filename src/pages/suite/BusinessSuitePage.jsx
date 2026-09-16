import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../lib/api'
import { FolderIcon, PlusIcon, UsersIcon, ChevronRightIcon } from '../../components/icons'

const BILLING = [
  { id: 'one_time', label: 'One-time', blurb: 'A single project with a start and an end.' },
  { id: 'recurring', label: 'Recurring', blurb: 'A retainer where you choose what goes out each month.' },
]

const EMPTY = { name: '', clientName: '', clientCompany: '', clientEmail: '', billingType: 'one_time' }

export default function BusinessSuitePage() {
  const [projects, setProjects] = useState(null)
  const [profile, setProfile] = useState(undefined) // undefined = loading
  const [form, setForm] = useState(EMPTY)
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [{ projects: rows }, { profile: p }] = await Promise.all([
        api.fetchProjects(),
        api.fetchStudioProfile(),
      ])
      setProjects(rows)
      setProfile(p)
    } catch (err) {
      setError(err.message)
      setProjects([])
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function create(e) {
    e.preventDefault()
    if (!form.name.trim() || creating) return
    setCreating(true)
    setError('')
    try {
      await api.createProject(form)
      setForm(EMPTY)
      setOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <>
      {/* Documents carry the subscriber's own identity, not Routicle's, so this
          has to exist before a proposal means anything. */}
      {profile === null && (
        <div className="suite-banner">
          <div>
            <strong>Set up your studio profile first</strong>
            <span>
              Your proposals and contracts use it. It holds your studio name, contact details and bank account, plus the vision, team and case study that go into every proposal.
            </span>
          </div>
          <Link to="/suite/business/studio" className="settings-btn settings-btn-primary">Set it up</Link>
        </div>
      )}

      <div className="suite-section-head">
        <div>
          <h2>Client projects</h2>
          <p className="settings-section-desc">One folder per client. Everything for that relationship lives inside it.</p>
        </div>
        <div className="settings-inline-actions">
          <Link to="/suite/business/studio" className="settings-btn">Studio profile</Link>
          <button type="button" className="settings-btn settings-btn-primary" onClick={() => setOpen((v) => !v)}>
            <PlusIcon size={13} color="currentColor" />
            Create project
          </button>
        </div>
      </div>

      {error && <p className="settings-error">{error}</p>}

      {open && (
        <form className="suite-create" onSubmit={create}>
          <div className="admin-form-row">
            <label className="settings-stack-field">
              <span className="settings-stack-label">Project name</span>
              <input
                type="text"
                className="settings-input"
                value={form.name}
                placeholder="Name it after the client's business"
                onChange={(e) => set('name', e.target.value)}
                required
              />
            </label>
            <label className="settings-stack-field">
              <span className="settings-stack-label">Client contact</span>
              <input
                type="text"
                className="settings-input"
                value={form.clientName}
                placeholder="Who you deal with"
                onChange={(e) => set('clientName', e.target.value)}
              />
            </label>
            <label className="settings-stack-field">
              <span className="settings-stack-label">Client email</span>
              <input
                type="email"
                className="settings-input"
                value={form.clientEmail}
                onChange={(e) => set('clientEmail', e.target.value)}
              />
            </label>
          </div>

          <div className="suite-billing-row">
            {BILLING.map((b) => (
              <button
                key={b.id}
                type="button"
                className={form.billingType === b.id ? 'suite-billing suite-billing-active' : 'suite-billing'}
                onClick={() => set('billingType', b.id)}
              >
                <strong>{b.label}</strong>
                <span>{b.blurb}</span>
              </button>
            ))}
          </div>

          <div className="settings-actions">
            <button type="submit" className="settings-btn settings-btn-primary" disabled={creating || !form.name.trim()}>
              {creating ? 'Creating…' : 'Create project'}
            </button>
            <button type="button" className="settings-btn settings-btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {projects === null ? (
        <p className="explore-empty">Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="page-empty-state">
          <FolderIcon size={26} color="currentColor" />
          <h2>No client projects yet</h2>
          <p>Create one per client. Inside it you build a discovery form, send it, and generate the paperwork from what comes back.</p>
          <button type="button" className="settings-btn settings-btn-primary" onClick={() => setOpen(true)}>
            Create your first project
          </button>
        </div>
      ) : (
        <div className="suite-project-grid">
          {projects.map((p) => (
            <Link key={p.id} to={`/suite/business/${p.id}`} className="suite-project">
              <span className="suite-project-icon">
                {p.billingType === 'recurring' ? <UsersIcon size={17} color="currentColor" /> : <FolderIcon size={17} color="currentColor" />}
              </span>
              <div className="suite-project-text">
                <span className="suite-project-name">
                  {p.name}
                  <span className={`suite-pill suite-pill-${p.billingType}`}>
                    {p.billingType === 'recurring' ? 'Recurring' : 'One-time'}
                  </span>
                </span>
                <span className="suite-project-meta">
                  {p.clientCompany || p.clientName || 'No client contact yet'} · {p.docCount} document
                  {p.docCount === 1 ? '' : 's'} · {p.responseCount} response{p.responseCount === 1 ? '' : 's'}
                </span>
              </div>
              <ChevronRightIcon size={13} color="currentColor" />
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
