import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../lib/api'
import { ChevronRightIcon } from '../../components/icons'

const EMPTY = {
  studioName: '',
  leadName: '',
  roleTitle: 'Design Lead',
  address: '',
  phone: '',
  email: '',
  website: '',
  bankName: '',
  accountName: '',
  accountNumber: '',
  currency: 'NGN',
  vision: '',
  mission: '',
  coreValues: [],
  about: '',
  whatWeDo: [],
  staff: [],
  caseStudy: { clientName: '', summary: '', goals: [], results: [] },
}

const lines = (v) => (Array.isArray(v) ? v.join('\n') : '')
const toLines = (v) => v.split('\n').map((s) => s.trim()).filter(Boolean)

/**
 * Written once, reused by every document.
 *
 * This is the piece that makes the Suite shippable to anyone: the proposal
 * template carries a studio's vision, staff and case study, so without a per
 * subscriber profile every generated proposal would go out under whoever's
 * details the template was built from.
 */
export default function StudioProfilePage() {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api
      .fetchStudioProfile()
      .then(({ profile }) => {
        if (profile) {
          setForm({ ...EMPTY, ...profile, caseStudy: { ...EMPTY.caseStudy, ...(profile.caseStudy || {}) } })
        }
      })
      .catch((err) => setError(err.message))
  }, [])

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setNotice('')
  }
  const setCase = (k, v) => setForm((f) => ({ ...f, caseStudy: { ...f.caseStudy, [k]: v } }))

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.saveStudioProfile(form)
      setNotice('Studio profile saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Staff is edited as pipe-separated lines rather than a repeating field set:
  // it is a handful of rows edited rarely, and a textarea is far less friction
  // than add/remove row controls for something you fill in once.
  const staffText = form.staff.map((s) => `${s.name} | ${s.role} | ${s.years || ''} | ${s.bio || ''}`).join('\n')

  function parseStaff(value) {
    return value
      .split('\n')
      .map((line) => line.split('|').map((x) => x.trim()))
      .filter((parts) => parts[0])
      .map((parts) => ({ name: parts[0], role: parts[1] || '', years: parts[2] || '', bio: parts[3] || '' }))
  }

  return (
    <form onSubmit={save}>
      <div className="suite-crumbs">
        <Link to="/suite/business">Business Suite</Link>
        <ChevronRightIcon size={11} color="currentColor" />
        <span>Studio profile</span>
      </div>

      <div className="suite-section-head">
        <div>
          <h2>Studio profile</h2>
          <p className="settings-section-desc">
            You only fill this in once. Every proposal, contract and invoice uses it, which is what makes the documents feel like yours instead of a generic template.
          </p>
        </div>
      </div>

      <section className="settings-section">
        <div className="settings-section-head">
          <div><h2>Identity</h2></div>
        </div>
        <div className="settings-card settings-card-form">
          <div className="admin-form-row">
            <label className="settings-stack-field">
              <span className="settings-stack-label">Studio name</span>
              <input className="settings-input" value={form.studioName} onChange={(e) => set('studioName', e.target.value)} required />
            </label>
            <label className="settings-stack-field">
              <span className="settings-stack-label">Your name</span>
              <input className="settings-input" value={form.leadName} onChange={(e) => set('leadName', e.target.value)} />
            </label>
            <label className="settings-stack-field">
              <span className="settings-stack-label">Role</span>
              <input className="settings-input" value={form.roleTitle} onChange={(e) => set('roleTitle', e.target.value)} />
            </label>
          </div>
          <div className="admin-form-row">
            <label className="settings-stack-field">
              <span className="settings-stack-label">Email</span>
              <input type="email" className="settings-input" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </label>
            <label className="settings-stack-field">
              <span className="settings-stack-label">Phone</span>
              <input className="settings-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </label>
            <label className="settings-stack-field">
              <span className="settings-stack-label">Address</span>
              <input className="settings-input" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </label>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-head">
          <div>
            <h2>Payment details</h2>
            <p className="settings-section-desc">Printed on contracts and invoices.</p>
          </div>
        </div>
        <div className="settings-card settings-card-form">
          <div className="admin-form-row">
            <label className="settings-stack-field">
              <span className="settings-stack-label">Bank</span>
              <input className="settings-input" value={form.bankName} onChange={(e) => set('bankName', e.target.value)} />
            </label>
            <label className="settings-stack-field">
              <span className="settings-stack-label">Account name</span>
              <input className="settings-input" value={form.accountName} onChange={(e) => set('accountName', e.target.value)} />
            </label>
            <label className="settings-stack-field">
              <span className="settings-stack-label">Account number</span>
              <input className="settings-input" value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} />
            </label>
            <label className="settings-stack-field">
              <span className="settings-stack-label">Currency</span>
              <select className="settings-input" value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-head">
          <div>
            <h2>Proposal content</h2>
            <p className="settings-section-desc">
              The fixed narrative every proposal carries. Written once, reused for every client.
            </p>
          </div>
        </div>
        <div className="settings-card settings-card-form">
          <label className="settings-stack-field">
            <span className="settings-stack-label">Vision</span>
            <textarea className="settings-textarea" rows={2} value={form.vision} onChange={(e) => set('vision', e.target.value)} />
          </label>
          <label className="settings-stack-field">
            <span className="settings-stack-label">Mission</span>
            <textarea className="settings-textarea" rows={2} value={form.mission} onChange={(e) => set('mission', e.target.value)} />
          </label>
          <label className="settings-stack-field">
            <span className="settings-stack-label">Core values</span>
            <span className="settings-stack-hint">One per line.</span>
            <textarea
              className="settings-textarea"
              rows={3}
              value={lines(form.coreValues)}
              onChange={(e) => set('coreValues', toLines(e.target.value))}
            />
          </label>
          <label className="settings-stack-field">
            <span className="settings-stack-label">About the studio</span>
            <textarea className="settings-textarea" rows={3} value={form.about} onChange={(e) => set('about', e.target.value)} />
          </label>
          <label className="settings-stack-field">
            <span className="settings-stack-label">What you do</span>
            <span className="settings-stack-hint">One per line.</span>
            <textarea
              className="settings-textarea"
              rows={3}
              value={lines(form.whatWeDo)}
              onChange={(e) => set('whatWeDo', toLines(e.target.value))}
            />
          </label>
          <label className="settings-stack-field">
            <span className="settings-stack-label">Team</span>
            <span className="settings-stack-hint">One per line: Name | Role | Years | Short bio</span>
            <textarea
              className="settings-textarea"
              rows={4}
              value={staffText}
              onChange={(e) => set('staff', parseStaff(e.target.value))}
            />
          </label>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-head">
          <div>
            <h2>Case study</h2>
            <p className="settings-section-desc">One piece of past work, quoted in every proposal.</p>
          </div>
        </div>
        <div className="settings-card settings-card-form">
          <label className="settings-stack-field">
            <span className="settings-stack-label">Summary</span>
            <textarea className="settings-textarea" rows={3} value={form.caseStudy.summary} onChange={(e) => setCase('summary', e.target.value)} />
          </label>
          <div className="admin-form-row">
            <label className="settings-stack-field">
              <span className="settings-stack-label">Goals</span>
              <span className="settings-stack-hint">One per line.</span>
              <textarea className="settings-textarea" rows={3} value={lines(form.caseStudy.goals)} onChange={(e) => setCase('goals', toLines(e.target.value))} />
            </label>
            <label className="settings-stack-field">
              <span className="settings-stack-label">Results</span>
              <span className="settings-stack-hint">One per line.</span>
              <textarea className="settings-textarea" rows={3} value={lines(form.caseStudy.results)} onChange={(e) => setCase('results', toLines(e.target.value))} />
            </label>
          </div>
        </div>
      </section>

      {error && <p className="settings-error">{error}</p>}
      {notice && <p className="settings-notice">{notice}</p>}

      <div className="settings-actions settings-actions-sticky">
        <button type="submit" className="settings-btn settings-btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save studio profile'}
        </button>
      </div>
    </form>
  )
}
