import { useEffect, useState } from 'react'
import * as api from '../../lib/api'
import { Toggle } from '../../components/settings/SettingsControls'

/** App-wide switches: full admins only. Takes effect for everyone within about 30 seconds. */
export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    api
      .fetchAdminSettings()
      .then(({ settings: s }) => {
        setSettings(s)
        setMessage(s.maintenanceMessage || '')
      })
      .catch((err) => setError(err.message))
  }, [])

  async function save(key, value) {
    setBusy(key)
    setError('')
    try {
      await api.saveAdminSetting(key, value)
      setSettings((s) => ({ ...s, [key]: value }))
      setNotice('Saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  if (!settings) {
    return (
      <section className="admin-section">
        <header className="adm-page-head"><h2>Site settings</h2></header>
        {error ? <p className="settings-error">{error}</p> : <p className="explore-empty">Loading…</p>}
      </section>
    )
  }

  return (
    <section className="admin-section">
      <header className="adm-page-head">
        <h2>Site settings</h2>
        <p>A few switches for the whole platform. Changes reach every visitor within about 30 seconds — no redeploy.</p>
      </header>

      {error && <p className="settings-error">{error}</p>}
      {notice && <p className="settings-notice">{notice}</p>}

      <div className="admin-form">
        <label className="settings-field">
          <span className="settings-field-label">Maintenance banner</span>
          <span className="settings-field-hint">Shown at the top of every page when it isn't empty. Leave it blank to hide it.</span>
          <div className="adm-lead-add-actions">
            <input
              className="settings-input"
              style={{ flex: 1, minWidth: 240 }}
              value={message}
              maxLength={300}
              placeholder="e.g. We're doing scheduled maintenance until 3pm WAT."
              onChange={(e) => setMessage(e.target.value)}
            />
            <button type="button" className="settings-btn" disabled={busy === 'maintenanceMessage'} onClick={() => save('maintenanceMessage', message)}>
              {busy === 'maintenanceMessage' ? 'Saving…' : 'Save'}
            </button>
            {settings.maintenanceMessage && (
              <button type="button" className="settings-btn settings-btn-ghost" onClick={() => { setMessage(''); save('maintenanceMessage', '') }}>
                Clear
              </button>
            )}
          </div>
        </label>

        <div className="settings-row">
          <div>
            <span className="settings-field-label">New sign-ups</span>
            <p className="settings-field-hint">Off stops new accounts being created. Existing accounts can still sign in.</p>
          </div>
          <Toggle checked={settings.signupsEnabled} onChange={(v) => save('signupsEnabled', v)} disabled={busy === 'signupsEnabled'} />
        </div>

        <div className="settings-row">
          <div>
            <span className="settings-field-label">AI image generation</span>
            <p className="settings-field-hint">Off pauses new AI images platform-wide, regardless of plan. Existing images are unaffected.</p>
          </div>
          <Toggle checked={settings.aiImagesEnabled} onChange={(v) => save('aiImagesEnabled', v)} disabled={busy === 'aiImagesEnabled'} />
        </div>
      </div>
    </section>
  )
}
