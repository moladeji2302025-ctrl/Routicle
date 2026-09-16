import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const GUIDELINES = [
  'Give every layer a clear name instead of leaving defaults like "Layer 1."',
  'Group related layers into clearly labeled folders.',
  'Remove hidden, unused, or duplicate layers before submitting.',
  'Keep text layers live and editable wherever possible, rather than flattened.',
  'List any non-default fonts used, or outline the text, so downloaders aren’t stuck missing fonts.',
  'Flag any linked or embedded third-party assets (stock photos, icons) separately.',
  "Add a clean JPEG or PNG thumbnail that shows what the work looks like. It's required, and separate from the work files. Video submissions also need a short MP4 preview.",
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
      // Land on the creator dashboard, not the upload form. Applying and
      // uploading are separate decisions — being dropped straight into a file
      // picker reads as "you cannot finish signing up without work to hand",
      // which is exactly the wall this page promises there isn't.
      navigate('/dashboard')
    } catch (err) {
      console.error('applyAsCreator failed', err)
      setSubmitting(false)
    }
  }

  return (
    <div className="creator-apply-page">
      <div className="creator-apply-hero">
        <h1>Become a Creator</h1>
        <p>Your unused work is worth something. Here's how it works, in plain language.</p>
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
            Confirm you have full commercial rights to the work, and that it doesn't include client-owned trademarks, logos or confidential material you aren't allowed to share. This matters because a lot of work on Routicle started as client projects, and client contracts don't always give the designer full ownership of rejected concepts.
          </p>
        </section>

        <section className="creator-apply-section">
          <h2>How payment works</h2>
          <p>You earn money when subscribers download your work, calculated and paid out monthly.</p>
          <ul className="creator-apply-list">
            <li><strong>Pay-per-download:</strong> 50% of every pay-per-download purchase, paid to you in full.</li>
            <li><strong>Your share:</strong> currently 50%.</li>
            <li><strong>Payout cycle:</strong> monthly close, with an early payout once your balance crosses $50 before day 15.</li>
            <li><strong>Referrals:</strong> your own referral link earns a one-time bonus once someone who signs up through it becomes a paying subscriber.</li>
            <li><strong>Consistency bonus:</strong> each month, a limited number of the most active and best-performing creators get a flat bonus on top of their download earnings.</li>
            <li><strong>Staying eligible:</strong> at least one approved upload within a rolling 90-day window keeps you eligible for the pool.</li>
          </ul>
          <p className="creator-apply-note">
            We don't show total platform revenue, subscriber counts or other creators' earnings. You only see your own numbers and how we worked them out.
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
          {submitting ? 'Applying…' : 'Finish signing up'}
        </button>
      </form>
    </div>
  )
}
