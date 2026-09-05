import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { Section, Row, Feedback } from '../../components/settings/SettingsControls'

export default function CreatorSettings() {
  const { currentUser, contentItems, pendingSubmissions, setPayoutMethod } = useApp()
  const [payout, setPayout] = useState(currentUser.payoutMethod || '')
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)

  const myPieces = contentItems.filter((item) => item.creator === currentUser.name)
  const myPending = pendingSubmissions.filter((s) => s.creatorName === currentUser.name)
  const referralUrl = `https://routicle.app/r/${currentUser.referralCode}`

  function handleCopy() {
    navigator.clipboard?.writeText(referralUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Section
        title="Your library"
        description="Everything you've put into the pool."
        actions={
          <Link to="/upload" className="settings-btn settings-btn-ghost">
            Upload
          </Link>
        }
      >
        <Row title="Live pieces" description="Approved and earning from the pool.">
          <span className="settings-static-value">{myPieces.length}</span>
        </Row>
        <Row title="In review" description="Waiting on moderation before going live.">
          <span className="settings-static-value">{myPending.length}</span>
        </Row>
        <Row title="Earnings" description="Your share of the monthly pool.">
          <span className="settings-static-value">
            ${currentUser.earningsThisMonth.toFixed(2)} this month · ${currentUser.allTimeEarnings.toFixed(2)} all time
          </span>
        </Row>
      </Section>

      <Section
        title="Payouts"
        description="Where your share of the pool is sent. Balances pay out monthly once they pass $50."
      >
        <Row title="Payout method" description="Bank account, PayPal address or mobile-money number." stacked>
          <div className="settings-inline-form">
            <input
              type="text"
              className="settings-input"
              value={payout}
              placeholder="e.g. GTBank · 0123456789"
              onChange={(e) => {
                setPayout(e.target.value)
                setNotice('')
              }}
            />
            <button
              type="button"
              className="settings-btn settings-btn-primary"
              disabled={payout === (currentUser.payoutMethod || '')}
              onClick={() => {
                setPayoutMethod(payout.trim())
                setNotice('Payout method saved.')
              }}
            >
              Save
            </button>
          </div>
        </Row>
        <Feedback notice={notice} />

        <Row title="Payout history">
          {currentUser.payoutHistory.length === 0 ? (
            <span className="settings-row-desc">No payouts yet.</span>
          ) : (
            <span className="settings-static-value">{currentUser.payoutHistory.length} payouts</span>
          )}
        </Row>
      </Section>

      <Section title="Referrals" description="A one-off $15 bonus once a referred signup's first payment clears.">
        <Row title="Your link" description={`${currentUser.referralCount} signups · $${currentUser.referralEarnings.toFixed(2)} earned`} stacked>
          <div className="settings-inline-form">
            <input type="text" className="settings-input" value={referralUrl} readOnly />
            <button type="button" className="settings-btn" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </Row>
      </Section>
    </>
  )
}
