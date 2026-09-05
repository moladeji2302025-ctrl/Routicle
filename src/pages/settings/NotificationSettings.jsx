import { useApp } from '../../context/AppContext'
import { Section, Row, Toggle } from '../../components/settings/SettingsControls'

const ACTIVITY = [
  {
    key: 'followedCreators',
    title: 'New work from creators you follow',
    description: 'A note when someone you follow publishes.',
  },
  {
    key: 'teamActivity',
    title: 'Team activity',
    description: 'Invites, joins, and changes to your shared plan.',
  },
]

const ACCOUNT = [
  {
    key: 'moderationResults',
    title: 'Upload review results',
    description: 'When a piece you submitted is approved or sent back.',
    creatorOnly: true,
  },
  {
    key: 'payouts',
    title: 'Payouts',
    description: 'Monthly pool statements and payment confirmations.',
    creatorOnly: true,
  },
  {
    key: 'productUpdates',
    title: 'Product updates',
    description: 'Meaningful changes to how Routicle works. Rare.',
  },
  {
    key: 'marketing',
    title: 'Offers and promotions',
    description: 'Discounts and campaigns. Off by default.',
  },
]

export default function NotificationSettings() {
  const { currentUser, settings, updateSettings, resetSettings } = useApp()
  const n = settings.notifications

  const accountRows = ACCOUNT.filter((row) => !row.creatorOnly || currentUser.isCreator)

  return (
    <>
      <Section
        title="Activity"
        description={`Sent to ${currentUser.email}.`}
        actions={
          <button
            type="button"
            className="settings-btn settings-btn-ghost"
            onClick={() => resetSettings('notifications')}
          >
            Reset
          </button>
        }
      >
        {ACTIVITY.map((row) => (
          <Row key={row.key} title={row.title} description={row.description}>
            <Toggle
              label={row.title}
              checked={n[row.key]}
              onChange={(value) => updateSettings('notifications', { [row.key]: value })}
            />
          </Row>
        ))}
      </Section>

      <Section title="Account & platform">
        {accountRows.map((row) => (
          <Row key={row.key} title={row.title} description={row.description}>
            <Toggle
              label={row.title}
              checked={n[row.key]}
              onChange={(value) => updateSettings('notifications', { [row.key]: value })}
            />
          </Row>
        ))}
      </Section>

      <p className="settings-footnote">
        These preferences are saved to your account now. Email delivery itself goes live with the
        notification service — nothing is sent until then, whatever is switched on here.
      </p>
    </>
  )
}
