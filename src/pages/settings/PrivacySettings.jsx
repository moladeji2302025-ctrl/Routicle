import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Section, Row, Toggle, Segmented, DangerZone, Feedback } from '../../components/settings/SettingsControls'

const VISIBILITY = [
  { id: 'public', label: 'Public' },
  { id: 'private', label: 'Private' },
]

export default function PrivacySettings() {
  const {
    settings,
    updateSettings,
    recentlyViewed,
    clearRecentlyViewed,
    exportAccountData,
    resetLocalData,
    currentUser,
  } = useApp()
  const p = settings.privacy
  const [notice, setNotice] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  function handleExport() {
    const data = exportAccountData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `routicle-data-${currentUser.email.split('@')[0]}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Revoke on the next tick so the click has definitely started the download.
    setTimeout(() => URL.revokeObjectURL(url), 0)
    setNotice('Export downloaded.')
  }

  return (
    <>
      <Section
        title="Visibility"
        description="What other people can see about you. Saved to your account and applied once profiles are served from the API — public profile pages are still rendered client-side today."
      >
        <Row
          title="Creator profile"
          description={
            p.profileVisibility === 'public'
              ? 'Your profile, bio and published work are visible to anyone.'
              : 'Your profile page is hidden. Published work stays credited to your name.'
          }
        >
          <Segmented
            name="Profile visibility"
            options={VISIBILITY}
            value={p.profileVisibility}
            onChange={(profileVisibility) => updateSettings('privacy', { profileVisibility })}
          />
        </Row>
        <Row title="Show what I've appreciated" description="Lets others see the pieces you've hearted.">
          <Toggle
            label="Show appreciations"
            checked={p.showAppreciations}
            onChange={(showAppreciations) => updateSettings('privacy', { showAppreciations })}
          />
        </Row>
      </Section>

      <Section
        title="Browsing history"
        description="Powers “Pick up where you left off” on your dashboard. Stored on this device only."
      >
        <Row
          title="Record what I view"
          description={
            p.saveRecentlyViewed
              ? `${recentlyViewed.length} item${recentlyViewed.length === 1 ? '' : 's'} remembered.`
              : 'Nothing new is being recorded.'
          }
        >
          <Toggle
            label="Record viewing history"
            checked={p.saveRecentlyViewed}
            onChange={(saveRecentlyViewed) => updateSettings('privacy', { saveRecentlyViewed })}
          />
        </Row>
        <Row title="Clear history now" description="Removes everything already recorded.">
          <button
            type="button"
            className="settings-btn"
            disabled={recentlyViewed.length === 0}
            onClick={() => {
              clearRecentlyViewed()
              setNotice('Viewing history cleared.')
            }}
          >
            Clear
          </button>
        </Row>
      </Section>

      <Section title="Your data" description="Take a copy of everything this account holds.">
        <Row
          title="Export account data"
          description="Profile, preferences, teams, subscription and history, as JSON."
        >
          <button type="button" className="settings-btn" onClick={handleExport}>
            Download export
          </button>
        </Row>
        <Feedback notice={notice} />
      </Section>

      <DangerZone
        title="Reset this device"
        description="Clears the cached profile, preferences and history held in this browser. Your account, plan and uploads are untouched — signing back in restores them from the server."
      >
        <Row title="Reset local app data" description="You'll be returned to defaults and signed back in fresh.">
          {confirmReset ? (
            <div className="settings-inline-actions">
              <button
                type="button"
                className="settings-btn settings-btn-danger"
                onClick={() => {
                  resetLocalData()
                  window.location.assign('/')
                }}
              >
                Yes, reset
              </button>
              <button type="button" className="settings-btn settings-btn-ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="settings-btn settings-btn-danger" onClick={() => setConfirmReset(true)}>
              Reset
            </button>
          )}
        </Row>
      </DangerZone>
    </>
  )
}
