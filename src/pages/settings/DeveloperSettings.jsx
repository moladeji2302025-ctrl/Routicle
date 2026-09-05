import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { Section, Row, Segmented, Toggle } from '../../components/settings/SettingsControls'

const ROLES = [
  { id: 'free', label: 'Free' },
  { id: 'standard', label: 'Standard' },
  { id: 'express', label: 'Express' },
]

const CREDITS_FOR = {
  free: { image: 0, video: 0 },
  standard: { image: 50, video: 0 },
  express: { image: 50, video: 60 },
}

export default function DeveloperSettings() {
  const { currentUser, subscription, devSetUser, pendingSubmissions, resetSettings } = useApp()

  return (
    <>
      <Section
        title="Role simulation"
        description="Prototype-only. Jumps this session into another tier so gated screens can be checked without paying."
      >
        <Row
          title="Tier"
          description={
            subscription
              ? `A real ${subscription.tier} subscription is active — it will overwrite this on the next refresh.`
              : 'No server-side subscription, so this sticks until you change it.'
          }
        >
          <Segmented
            name="Tier"
            options={ROLES}
            value={currentUser.role}
            onChange={(role) => devSetUser({ role, credits: CREDITS_FOR[role] })}
          />
        </Row>
        <Row title="Creator status" description="Unlocks upload, the creator dashboard and payout settings.">
          <Toggle
            label="Creator status"
            checked={currentUser.isCreator}
            onChange={(isCreator) => devSetUser({ isCreator })}
          />
        </Row>
        <Row title="Admin status" description="Unlocks the moderation queue.">
          <Toggle label="Admin status" checked={currentUser.isAdmin} onChange={(isAdmin) => devSetUser({ isAdmin })} />
        </Row>
      </Section>

      {currentUser.isAdmin && (
        <Section title="Moderation" description="Platform-wide queue — visible because this account has admin.">
          <Row
            title="Pending submissions"
            description={
              pendingSubmissions.length === 0 ? 'Queue is empty.' : 'Waiting on a decision before going live.'
            }
          >
            <div className="settings-inline-actions">
              <span className="settings-static-value">{pendingSubmissions.length}</span>
              <Link to="/admin" className="settings-btn">
                Open queue
              </Link>
            </div>
          </Row>
        </Section>
      )}

      <Section title="Preferences" description="Restores every setting in this section list to its shipped default.">
        <Row title="Reset all settings" description="Profile, plan and team membership aren't affected.">
          <button type="button" className="settings-btn settings-btn-danger" onClick={() => resetSettings()}>
            Reset all
          </button>
        </Row>
      </Section>

      <p className="settings-footnote">
        Signed in as {currentUser.email} · account id <code>{currentUser.id}</code>
      </p>
    </>
  )
}
