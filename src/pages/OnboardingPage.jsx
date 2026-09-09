import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { DEPARTMENTS } from '../data/departments'
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
    points: ['Source files, not flattened exports', 'AI Image and Video Studio', 'Shared team collections'],
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

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { currentUser, settings, completeOnboarding } = useApp()

  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [phase, setPhase] = useState('in')
  const [saving, setSaving] = useState(false)
  const timerRef = useRef(null)

  const [form, setForm] = useState({
    path: '',
    name: '',
    website: '',
    heard: '',
    role: '',
    goals: [],
    departments: DEPARTMENTS.map((d) => d.id),
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
        id: 'departments',
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
      await completeOnboarding({ ...form, tier })
    } finally {
      setSaving(false)
    }
    if (tier && tier !== 'free') navigate('/pricing')
    else if (form.path === 'sell') navigate('/become-creator')
    else navigate('/')
  }

  return (
    <div className="onb">
      <header className="onb-top">
        <img src="/brand/routicle-mark-black.svg" alt="" className="onb-mark" />
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

          {current.id === 'departments' && (
            <div className="onb-grid onb-grid-3">
              {DEPARTMENTS.map((d, i) => {
                const on = form.departments.includes(d.id)
                return (
                  <button
                    key={d.id}
                    type="button"
                    className={`onb-card onb-card-wide onb-item${on ? ' onb-card-on' : ''}`}
                    style={{ '--i': i + 2 }}
                    onClick={() => toggle('departments', d.id)}
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
