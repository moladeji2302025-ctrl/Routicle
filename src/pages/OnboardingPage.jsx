import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { CATEGORIES } from '../data/categories'
import { TIERS } from '../data/pricing'
import {
  SearchIcon,
  UploadIcon,
  SparkleIcon,
  ImageIcon,
  VideoIcon,
  UsersIcon,
  FolderIcon,
  HeartIcon,
  PenIcon,
  ChartIcon,
  StarIcon,
  GridIcon,
} from '../components/icons'

/** How long the outgoing step is given to clear before the next one mounts. */
const EXIT_MS = 260

const PATHS = [
  {
    id: 'browse',
    label: 'I want to use work',
    blurb: 'Download real, editable source files from finished projects.',
    points: ['Source files, not flattened exports', 'Creative and Business Suite', 'Shared team collections'],
  },
  {
    id: 'sell',
    label: 'I want to sell my work',
    blurb: 'Upload finished work you never reused, and earn from it every month.',
    points: ['Half of subscription revenue is pooled', 'Non-exclusive, keep every right', 'Paid out monthly'],
  },
]

const ROLES = [
  { id: 'graphic-designer', label: 'Graphic designer', icon: PenIcon },
  { id: 'motion-designer', label: 'Motion designer', icon: VideoIcon },
  { id: 'illustrator', label: 'Illustrator', icon: ImageIcon },
  { id: 'video-editor', label: 'Video editor', icon: VideoIcon },
  { id: 'marketer', label: 'Marketer', icon: ChartIcon },
  { id: 'studio', label: 'Studio or agency', icon: UsersIcon },
  { id: 'student', label: 'Student', icon: StarIcon },
  { id: 'other', label: 'Something else', icon: GridIcon },
]

const GOALS = [
  { id: 'source-files', label: 'Download source files', icon: FolderIcon },
  { id: 'ai-images', label: 'Generate AI images', icon: ImageIcon },
  { id: 'ai-video', label: 'Generate AI video', icon: VideoIcon },
  { id: 'inspiration', label: 'Find inspiration', icon: SearchIcon },
  { id: 'team', label: 'Share with a team', icon: UsersIcon },
  { id: 'earn', label: 'Earn from my work', icon: SparkleIcon },
  { id: 'collect', label: 'Build a collection', icon: HeartIcon },
  { id: 'client-work', label: 'Speed up client work', icon: UploadIcon },
]

const HEARD = ['A friend or colleague', 'Instagram', 'X', 'YouTube', 'A search engine', 'Somewhere else']

const PLAN_BLURB = {
  free: 'Browse everything. Download anything marked free.',
  standard: 'Every design source file, plus 50 AI images a month.',
  express: 'Adds video projects and 60 seconds of AI video a month.',
}

/** Whole-years age as of today, from a YYYY-MM-DD string — mirrors the server's own check. */
function ageFromDob(dob) {
  const d = new Date(`${dob}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const hadBirthdayThisYear =
    now.getMonth() > d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() >= d.getDate())
  if (!hadBirthdayThisYear) age -= 1
  return age
}

const MIN_AGE = 13

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { currentUser, settings, theme, completeOnboarding } = useApp()

  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [phase, setPhase] = useState('in')
  const [saving, setSaving] = useState(false)
  const timerRef = useRef(null)

  // The age check has to come before anything else in this flow can be
  // reached — including "Skip for now" in the header below, which otherwise
  // bypasses the whole wizard without ever asking anything. So this isn't one
  // of the six wizard steps: nothing past it, not even skipping, renders
  // until a valid, 13-or-older date of birth is entered.
  const [dob, setDob] = useState('')
  const [dobTouched, setDobTouched] = useState(false)
  const [ageGatePassed, setAgeGatePassed] = useState(false)
  const [rejected, setRejected] = useState(false)

  const [form, setForm] = useState({
    path: '',
    name: '',
    website: '',
    heard: '',
    role: '',
    goals: [],
    categories: CATEGORIES.map((d) => d.id),
    tier: '',
  })

  // Seed the name from the account once, and never over the top of typing.
  const seeded = useRef(false)
  useEffect(() => {
    if (!seeded.current && currentUser?.name) {
      seeded.current = true
      setForm((f) => (f.name ? f : { ...f, name: currentUser.name }))
    }
  }, [currentUser?.name])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const still = settings.appearance.reduceMotion

  const steps = useMemo(
    () => [
      {
        id: 'path',
        title: 'What brings you to Routicle?',
        sub: 'You can do both. This only decides where we drop you first.',
        ready: !!form.path,
      },
      { id: 'about', title: 'Tell us who you are', sub: 'All optional. It only shapes what you see first.', ready: true },
      { id: 'role', title: 'Which describes you best?', sub: 'Pick the closest one.', ready: true },
      { id: 'goals', title: 'What do you want to do here?', sub: 'Select all that apply.', ready: true },
      {
        id: 'categories',
        title: 'What should we show you?',
        sub: 'Anything you switch off stays out of your feeds. Change it any time in Settings.',
        ready: true,
      },
      {
        id: 'plan',
        title: 'Pick a plan',
        sub: 'Browsing is free forever. Source files and the AI Studios need a paid plan.',
        ready: true,
      },
    ],
    [form.path]
  )

  const current = steps[step]
  const isLast = step === steps.length - 1

  function go(next) {
    if (next < 0 || next >= steps.length || phase === 'out') return
    setDir(next > step ? 1 : -1)
    if (still) {
      setStep(next)
      return
    }
    // Let the outgoing step animate away before the incoming one mounts, so the
    // two never overlap in the layout.
    setPhase('out')
    timerRef.current = setTimeout(() => {
      setStep(next)
      setPhase('in')
    }, EXIT_MS)
  }

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggle(key, id) {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id],
    }))
  }

  async function finish(tierOverride) {
    if (saving) return
    setSaving(true)
    const tier = tierOverride === undefined ? form.tier : tierOverride
    try {
      await completeOnboarding({ ...form, tier, dateOfBirth: dob })
    } catch (err) {
      setSaving(false)
      if (err.underAge) {
        setRejected(true)
        return
      }
      // Any other error: completeOnboarding already applied local state and
      // logged it, so this flow still finishes rather than stranding someone.
    }
    setSaving(false)
    if (tier && tier !== 'free') navigate('/pricing')
    else if (form.path === 'sell') navigate('/become-creator')
    else navigate('/')
  }

  const dobAge = dob ? ageFromDob(dob) : null
  const dobInvalid = dobTouched && dob && (dobAge === null || dobAge < 0 || dobAge > 130)
  const dobTooYoung = dobTouched && dob && dobAge !== null && dobAge >= 0 && dobAge < MIN_AGE

  if (rejected) {
    return (
      <div className="onb">
        <main className="onb-main">
          <div className="onb-stage">
            <h1 className="onb-title">You need to be 13 or older to use Routicle</h1>
            <p className="onb-sub">
              This is required under children's privacy law (COPPA) in the US. The account you just created has been
              deactivated and can't be signed back into.
            </p>
            <button type="button" className="onb-next" style={{ marginTop: 24 }} onClick={() => navigate('/')}>
              Back to Routicle
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!ageGatePassed) {
    return (
      <div className="onb">
        <header className="onb-top">
          <img
            src={theme === 'dark' ? '/brand/routicle-mark-white.svg' : '/brand/routicle-mark-black.svg'}
            alt=""
            className="onb-mark"
          />
        </header>
        <main className="onb-main">
          <div className="onb-stage">
            <h1 className="onb-title onb-item" style={{ '--i': 0 }}>When were you born?</h1>
            <p className="onb-sub onb-item" style={{ '--i': 1 }}>
              Routicle needs this once, to confirm you're old enough to have an account. It's never shown on your
              profile or anywhere else.
            </p>
            <div className="onb-form">
              <label className="onb-field onb-item" style={{ '--i': 2 }}>
                <span>Date of birth</span>
                <input
                  type="date"
                  className="settings-input"
                  value={dob}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => { setDob(e.target.value); setDobTouched(true) }}
                  onBlur={() => setDobTouched(true)}
                />
              </label>
              {dobTooYoung && (
                <p className="onb-sub" style={{ color: 'var(--settings-danger, #d9432f)' }}>
                  You need to be 13 or older to create a Routicle account.
                </p>
              )}
              {dobInvalid && !dobTooYoung && (
                <p className="onb-sub" style={{ color: 'var(--settings-danger, #d9432f)' }}>
                  That date doesn't look right.
                </p>
              )}
            </div>
          </div>
        </main>
        <footer className="onb-foot">
          <div className="onb-nav">
            <button
              type="button"
              className="onb-next"
              disabled={!dob || dobInvalid || dobTooYoung}
              onClick={() => setAgeGatePassed(true)}
            >
              Continue
            </button>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="onb">
      <header className="onb-top">
        <img
          src={theme === 'dark' ? '/brand/routicle-mark-white.svg' : '/brand/routicle-mark-black.svg'}
          alt=""
          className="onb-mark"
        />
        <button type="button" className="onb-skip" onClick={() => finish('')} disabled={saving}>
          Skip for now
        </button>
      </header>

      <main className="onb-main">
        {/* Keyed on the step id so the entrance animation restarts on each
            change; data-phase drives the exit that plays before the swap. */}
        <div className="onb-stage" key={current.id} data-phase={phase} data-dir={dir}>
          <h1 className="onb-title onb-item" style={{ '--i': 0 }}>{current.title}</h1>
          <p className="onb-sub onb-item" style={{ '--i': 1 }}>{current.sub}</p>

          {current.id === 'path' && (
            <div className="onb-path-row">
              {PATHS.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className={`onb-path onb-item${form.path === p.id ? ' onb-path-on' : ''}`}
                  style={{ '--i': i + 2 }}
                  onClick={() => set('path', p.id)}
                  aria-pressed={form.path === p.id}
                >
                  <span className="onb-radio" aria-hidden="true" />
                  <span className="onb-path-label">{p.label}</span>
                  <span className="onb-path-blurb">{p.blurb}</span>
                  <ul className="onb-path-points">
                    {p.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          )}

          {current.id === 'about' && (
            <div className="onb-form">
              <label className="onb-field onb-item" style={{ '--i': 2 }}>
                <span>What should we call you?</span>
                <input
                  type="text"
                  className="settings-input"
                  value={form.name}
                  placeholder="Your name"
                  onChange={(e) => set('name', e.target.value)}
                />
              </label>

              <label className="onb-field onb-item" style={{ '--i': 3 }}>
                <span>Portfolio or website <em>(optional)</em></span>
                <input
                  type="text"
                  className="settings-input"
                  value={form.website}
                  placeholder="yourwork.com"
                  onChange={(e) => set('website', e.target.value)}
                />
              </label>

              <div className="onb-field onb-item" style={{ '--i': 4 }}>
                <span>How did you hear about us? <em>(optional)</em></span>
                <div className="onb-chip-row">
                  {HEARD.map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={form.heard === h ? 'onb-chip onb-chip-on' : 'onb-chip'}
                      onClick={() => set('heard', form.heard === h ? '' : h)}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {current.id === 'role' && (
            <div className="onb-grid onb-grid-4">
              {ROLES.map((r, i) => {
                const Icon = r.icon
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`onb-card onb-item${form.role === r.id ? ' onb-card-on' : ''}`}
                    style={{ '--i': i + 2 }}
                    onClick={() => set('role', form.role === r.id ? '' : r.id)}
                    aria-pressed={form.role === r.id}
                  >
                    <span className="onb-card-icon"><Icon size={18} color="currentColor" /></span>
                    <span className="onb-card-label">{r.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {current.id === 'goals' && (
            <div className="onb-grid onb-grid-4">
              {GOALS.map((g, i) => {
                const Icon = g.icon
                const on = form.goals.includes(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={`onb-card onb-item${on ? ' onb-card-on' : ''}`}
                    style={{ '--i': i + 2 }}
                    onClick={() => toggle('goals', g.id)}
                    aria-pressed={on}
                  >
                    <span className="onb-card-icon"><Icon size={18} color="currentColor" /></span>
                    <span className="onb-card-label">{g.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {current.id === 'categories' && (
            <div className="onb-grid onb-grid-3">
              {CATEGORIES.map((d, i) => {
                const on = form.categories.includes(d.id)
                return (
                  <button
                    key={d.id}
                    type="button"
                    className={`onb-card onb-card-wide onb-item${on ? ' onb-card-on' : ''}`}
                    style={{ '--i': i + 2 }}
                    onClick={() => toggle('categories', d.id)}
                    aria-pressed={on}
                  >
                    <span className="onb-check" aria-hidden="true" />
                    <span className="onb-card-label">{d.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {current.id === 'plan' && (
            <div className="onb-plan-row">
              {Object.values(TIERS).map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  className={`onb-plan onb-item${form.tier === t.id ? ' onb-plan-on' : ''}`}
                  style={{ '--i': i + 2 }}
                  onClick={() => set('tier', form.tier === t.id ? '' : t.id)}
                  aria-pressed={form.tier === t.id}
                >
                  <span className="onb-plan-name">{t.label}</span>
                  <span className="onb-plan-price">
                    {t.monthly === 0 ? 'Free' : `$${t.monthly}`}
                    {t.monthly > 0 && <em>/month</em>}
                  </span>
                  <span className="onb-plan-desc">{PLAN_BLURB[t.id]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="onb-foot">
        <div className="onb-nav">
          {step > 0 && (
            <button type="button" className="onb-back" onClick={() => go(step - 1)}>
              Back
            </button>
          )}
          <button
            type="button"
            className="onb-next"
            disabled={!current.ready || saving}
            onClick={() => (isLast ? finish() : go(step + 1))}
          >
            {isLast ? (form.tier && form.tier !== 'free' ? 'Continue to checkout' : 'Finish') : 'Continue'}
          </button>
        </div>

        <div
          className="onb-dots"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
        >
          {steps.map((s, i) => (
            <span key={s.id} className={i === step ? 'onb-dot onb-dot-on' : 'onb-dot'} />
          ))}
        </div>
      </footer>
    </div>
  )
}
