import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import * as api from '../../lib/api'
import { DEFAULT_SETTINGS } from '../../data/settings'
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
  {
    key: 'clientResponses',
    title: 'Client form responses',
    description: 'When a client fills in one of your Business Suite discovery forms.',
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
  const [saveError, setSaveError] = useState('')

  // The choice that counts is the one on the server, because that is where the
  // email is sent from. The browser copy is a fast cache of it.
  useEffect(() => {
    let cancelled = false
    api
      .fetchEmailPreferences()
      .then(({ preferences }) => {
        if (!cancelled) updateSettings('notifications', preferences)
      })
      .catch(() => {
        // offline or signed out: keep showing the local copy
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function change(patch) {
    updateSettings('notifications', patch)
    setSaveError('')
    api.saveEmailPreferences(patch).catch(() => setSaveError("That change couldn't be saved. Check your connection and try again."))
  }

  function reset() {
    resetSettings('notifications')
    setSaveError('')
    api.saveEmailPreferences(DEFAULT_SETTINGS.notifications).catch(() => setSaveError("That change couldn't be saved."))
  }

  const accountRows = ACCOUNT.filter((row) => !row.creatorOnly || currentUser.isCreator)

  return (
    <>
      <Section
        title="Activity"
        actions={
          <button
            type="button"
            className="settings-btn settings-btn-ghost"
            onClick={reset}
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
              onChange={(value) => change({ [row.key]: value })}
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
              onChange={(value) => change({ [row.key]: value })}
            />
          </Row>
        ))}
      </Section>

      {saveError && <p className="settings-error">{saveError}</p>}

      <p className="settings-footnote">
        Your choices are saved to your account. Receipts, security notices and workspace invites are always sent, because you need them.
      </p>
    </>
  )
}
