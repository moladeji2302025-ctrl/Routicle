import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const GUIDELINES = [
  'Name every layer descriptively — never leave default names like "Layer 1."',
  'Group related layers into clearly labeled folders.',
  'Remove hidden, unused, or duplicate layers before submitting.',
  'Keep text layers live and editable wherever possible, rather than flattened.',
  'List any non-default fonts used, or outline the text, so downloaders aren’t stuck missing fonts.',
  'Flag any linked or embedded third-party assets (stock photos, icons) separately.',
  'Upload a clean JPEG or PNG thumbnail that accurately represents the work — required, separate from the work files. Video submissions also need a short MP4 preview.',
]

export default function BecomeCreatorPage() {
  const { currentUser, applyAsCreator } = useApp()
  const navigate = useNavigate()
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [bio, setBio] = useState('')
  const [payoutMethod, setPayoutMethod] = useState('')

  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!currentUser) {
      navigate('/signup')
      return
    }
    if (!rightsConfirmed || !payoutMethod.trim() || submitting) return
    setSubmitting(true)
    try {
      await applyAsCreator({ bio, payoutMethod, social: {} })
      navigate('/upload')
    } catch (err) {
      console.error('applyAsCreator failed', err)
      setSubmitting(false)
    }
  }

  return (
    <div className="creator-apply-page">
      <div className="creator-apply-hero">
        <h1>Become a Creator</h1>
        <p>Your unused work is worth something. Here's exactly how it works — no legal wall, just the facts.</p>
      </div>

      <div className="creator-apply-grid">
        <section className="creator-apply-section">
          <h2>Upload guidelines checklist</h2>
          <ul className="creator-apply-checklist">
            {GUIDELINES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="creator-apply-note">
            Confirm full commercial rights to the work, and that it contains no client-owned trademarks, logos, or
            confidential material you aren't cleared to redistribute. This matters here specifically because
            Routicle's core supply is unused client work, and client contracts don't always transfer full ownership
            of rejected concepts to the designer.
          </p>
        </section>

        <section className="creator-apply-section">
          <h2>How payment works</h2>
          <p>You earn money when subscribers download your work, calculated and paid out monthly.</p>
          <ul className="creator-apply-list">
            <li><strong>Subscription pool:</strong> 50% of subscription revenue is split by usage across creators every cycle.</li>
            <li><strong>Pay-per-download:</strong> a direct cut of any pay-per-download purchase — 50%, paid in full.</li>
            <li><strong>Your share:</strong> currently 50%, plain and simple.</li>
            <li><strong>Payout cycle:</strong> monthly close, with an early payout once your balance crosses $50 before day 15.</li>
            <li><strong>Referrals:</strong> your own referral link earns a one-time bonus once someone who signs up through it becomes a paying subscriber.</li>
            <li><strong>Consistency bonus:</strong> each month, a capped group of the most active, best-performing creators receive a flat bonus on top of pool earnings — on top of downloads, not instead of them.</li>
            <li><strong>Staying eligible:</strong> at least one approved upload within a rolling 90-day window keeps you eligible for the pool.</li>
          </ul>
          <p className="creator-apply-note">
            We never show total platform revenue, subscriber counts, or other creators' earnings — only your own
            numbers and how they're calculated.
          </p>
        </section>
      </div>

      <form className="creator-apply-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          A little about you (shown on your public profile)
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="What do you make, and what should downloaders know about you?" />
        </label>
        <label className="auth-field">
          Payout account (bank via Paystack, or PayPal outside Nigeria)
          <input type="text" value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)} placeholder="Account details" required />
        </label>
        <label className="creator-apply-rights">
          <input type="checkbox" checked={rightsConfirmed} onChange={(e) => setRightsConfirmed(e.target.checked)} />
          I confirm I hold full commercial rights to the work I'll upload, with no client-owned trademarks or
          confidential material I'm not cleared to redistribute.
        </label>
        <button type="submit" className="btn-hero-primary auth-submit" disabled={!rightsConfirmed || submitting}>
          {submitting ? 'Applying…' : 'Apply and start uploading'}
        </button>
      </form>
    </div>
  )
}
