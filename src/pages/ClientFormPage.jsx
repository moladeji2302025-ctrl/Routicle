import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as api from '../lib/api'

/**
 * The page the client opens.
 *
 * Deliberately outside the app shell and outside auth: the person filling this
 * in is the subscriber's client, has no Routicle account, and should never be
 * asked to make one. It is forced light because it represents the subscriber's
 * studio to a stranger, not the signed-in app.
 */
export default function ClientFormPage() {
  const { slug } = useParams()
  const [form, setForm] = useState(null)
  const [answers, setAnswers] = useState({})
  const [who, setWho] = useState({ name: '', email: '' })
  const [state, setState] = useState('loading') // loading | ready | sending | done | error
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .fetchPublicForm(slug)
      .then(({ form: f }) => {
        setForm(f)
        setState('ready')
      })
      .catch((err) => {
        setError(err.message)
        setState('error')
      })
  }, [slug])

  async function submit(e) {
    e.preventDefault()
    setState('sending')
    setError('')
    try {
      await api.submitPublicForm(slug, { answers, respondentName: who.name, respondentEmail: who.email })
      setState('done')
    } catch (err) {
      setError(err.message)
      setState('ready')
    }
  }

  if (state === 'loading') return <div className="client-form"><p className="explore-empty">Loading…</p></div>

  if (state === 'error') {
    return (
      <div className="client-form">
        <div className="client-form-card">
          <h1>This form isn&apos;t available</h1>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (state === 'done') {
    return (
      <div className="client-form">
        <div className="client-form-card client-form-done">
          <h1>Thank you</h1>
          <p>Your answers have been sent. You&apos;ll hear back shortly.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="client-form">
      <form className="client-form-card" onSubmit={submit}>
        <header className="client-form-head">
          <h1>{form.title}</h1>
          {form.intro && <p>{form.intro}</p>}
        </header>

        <div className="admin-form-row">
          <label className="settings-stack-field">
            <span className="settings-stack-label">Your name</span>
            <input className="settings-input" value={who.name} onChange={(e) => setWho((w) => ({ ...w, name: e.target.value }))} required />
          </label>
          <label className="settings-stack-field">
            <span className="settings-stack-label">Your email</span>
            <input type="email" className="settings-input" value={who.email} onChange={(e) => setWho((w) => ({ ...w, email: e.target.value }))} />
          </label>
        </div>

        {form.questions.map((q, i) => (
          <label key={q.id} className="settings-stack-field client-form-q">
            <span className="settings-stack-label">
              {i + 1}. {q.text}
            </span>
            {q.type === 'short' ? (
              <input
                className="settings-input"
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              />
            ) : (
              <textarea
                className="settings-textarea"
                rows={3}
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              />
            )}
          </label>
        ))}

        {error && <p className="settings-error">{error}</p>}

        <div className="settings-actions">
          <button type="submit" className="settings-btn settings-btn-primary" disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Send answers'}
          </button>
        </div>
      </form>
    </div>
  )
}
