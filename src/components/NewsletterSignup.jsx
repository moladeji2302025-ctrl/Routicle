import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { subscribeNewsletter } from '../lib/api'
import { trackNewsletterSignup } from '../lib/analytics'

const RETURN_MESSAGES = {
  confirmed: "You're subscribed. New work lands in your inbox from now on.",
  expired: 'That link has expired. Sign up again and we will send a fresh one.',
  unsubscribed: "You're unsubscribed and won't get any more emails from us.",
}

/**
 * Email capture for visitors who haven't made an account. Hidden once someone
 * is signed in, since they already get account email.
 *
 * `variant` is "band" for the strip inside the public feed, or "footer".
 */
export default function NewsletterSignup({ variant = 'band', source = variant }) {
  const { currentUser } = useApp()
  const [params] = useSearchParams()
  const returned = RETURN_MESSAGES[params.get('newsletter')]

  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('') // honeypot, never shown
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [message, setMessage] = useState('')

  if (currentUser) return null

  async function handleSubmit(e) {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    setMessage('')
    try {
      const res = await subscribeNewsletter({ email: email.trim(), source, website })
      setStatus('sent')
      setMessage(res.message || 'Check your inbox for a link to confirm.')
      trackNewsletterSignup(source)
    } catch (err) {
      setStatus('error')
      setMessage(err.message || "That didn't go through. Try again in a moment.")
    }
  }

  const done = status === 'sent'

  return (
    <section className={`nl nl-${variant}`} aria-label="Email updates">
      <div className="nl-copy">
        <h2 className="nl-title">{variant === 'footer' ? 'Get new work by email' : 'New work, once a week'}</h2>
        <p className="nl-sub">
          {returned && variant === 'band'
            ? returned
            : 'The best new uploads from creators, straight to your inbox. No account needed.'}
        </p>
      </div>

      {done ? (
        <p className="nl-done" role="status">
          {message}
        </p>
      ) : (
        <form className="nl-form" onSubmit={handleSubmit} noValidate>
          <label className="nl-visually-hidden" htmlFor={`nl-email-${variant}`}>
            Email address
          </label>
          <input
            id={`nl-email-${variant}`}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {/* Off screen and out of the tab order. People never fill it in; bots do. */}
          <input
            className="nl-trap"
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
          <button type="submit" disabled={status === 'sending' || !email.trim()}>
            {status === 'sending' ? 'Sending…' : 'Sign up'}
          </button>
          {status === 'error' && (
            <p className="nl-error" role="alert">
              {message}
            </p>
          )}
        </form>
      )}
    </section>
  )
}
