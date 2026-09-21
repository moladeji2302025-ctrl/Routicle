import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getStaticPage, STATIC_NAV, CONTACT_EMAIL } from '../data/staticPages'
import Reveal from '../components/Reveal'
import NewsletterSignup from '../components/NewsletterSignup'
import { SparkleIcon, SearchIcon, ChevronDownIcon } from '../components/icons'

/**
 * The site's information pages.
 *
 * One shell (an ambient glow, a hero, a sub-navigation between the pages and a
 * closing call to action) and a layout per kind of page, chosen by `layout` in
 * data/staticPages.js. Every page is built for what it actually says: About
 * explains how the marketplace works in three steps, Brand shows the real
 * swatches and marks, Help is a searchable accordion.
 */

/* ---------------------------------------------------------------- pieces */

const Arrow = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

/** Copies text and reports it for a moment, so the button can say "Copied". */
function useCopy() {
  const [copied, setCopied] = useState('')
  const timer = useRef(null)
  const copy = useCallback((text) => {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(''), 1600)
  }, [])
  return [copied, copy]
}

/** Splits "About Routicle" around its accent so the accent word can carry the gradient. */
function Title({ title, accent }) {
  const at = accent ? title.lastIndexOf(accent) : -1
  if (at < 0) return title
  return (
    <>
      {title.slice(0, at)}
      <span className="sp-accent">{accent}</span>
      {title.slice(at + accent.length)}
    </>
  )
}

function SubNav({ slug }) {
  return (
    <nav className="sp-nav" aria-label="Information pages">
      {STATIC_NAV.map((n) => (
        <Link key={n.slug} to={`/${n.slug}`} className={n.slug === slug ? 'sp-nav-link sp-nav-on' : 'sp-nav-link'} aria-current={n.slug === slug ? 'page' : undefined}>
          {n.label}
        </Link>
      ))}
    </nav>
  )
}

function Section({ label, children, className = '' }) {
  return (
    <Reveal as="section" className={`sp-section ${className}`}>
      {label && <h2 className="sp-label">{label}</h2>}
      {children}
    </Reveal>
  )
}

/* ---------------------------------------------------------------- layouts */

function About({ page }) {
  const { currentUser } = useApp()
  return (
    <>
      <Section label="How it works">
        <div className="sp-steps">
          {page.steps.map((s, i) => (
            <div key={s.title} className="sp-card sp-step">
              <span className="sp-step-n">0{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <figure className="sp-card sp-quote">
          <blockquote>{page.story.quote}</blockquote>
          <figcaption>{page.story.body}</figcaption>
        </figure>
      </Section>

      <Section label="Beyond the library">
        <div className="sp-card sp-suite">
          <div className="sp-suite-copy">
            <span className="sp-suite-icon"><SparkleIcon size={18} color="currentColor" /></span>
            <h3>{page.suite.title}</h3>
            <p>{page.suite.body}</p>
            <Link to={currentUser ? '/suite/creative' : '/signup'} className="sp-link">
              {currentUser ? 'Open the Creative Suite' : 'Try it free'} <Arrow />
            </Link>
          </div>
          <ul className="sp-chips">
            {page.suite.features.map((f) => (
              <li key={f}><Check /> {f}</li>
            ))}
          </ul>
        </div>
      </Section>

      <Section>
        <div className="sp-status">
          <span className="sp-pulse" aria-hidden="true" />
          <p>{page.status}</p>
        </div>
      </Section>
    </>
  )
}

function Careers({ page }) {
  return (
    <Section>
      <div className="sp-card sp-open">
        <div className="sp-open-head">
          <span className="sp-pill sp-pill-idle"><span className="sp-pulse sp-pulse-idle" aria-hidden="true" /> {page.status.label}</span>
          <span className="sp-open-count">{page.status.detail}</span>
        </div>
        <p>{page.body}</p>
        <div className="sp-actions">
          <a className="sp-btn sp-btn-primary" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Careers at Routicle')}`}>
            Tell us you're interested <Arrow />
          </a>
          <Link className="sp-btn sp-btn-ghost" to="/contact">Contact page</Link>
        </div>
      </div>
    </Section>
  )
}

function Brand({ page }) {
  const [copied, copy] = useCopy()
  const [kind, setKind] = useState('mark')
  const tiles = [
    { name: 'On light', bg: '#F5F7FC', file: 'black' },
    { name: 'On dark', bg: '#111114', file: 'white' },
    { name: 'On violet', bg: '#6750DE', file: 'white' },
  ]
  const ink = (hex) => {
    const n = parseInt(hex.slice(1), 16)
    const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
    return l > 0.62 ? '#16161A' : '#FFFFFF'
  }
  return (
    <>
      <Section label="Logo">
        <div className="sp-seg" role="tablist" aria-label="Logo style">
          {[['mark', 'Mark'], ['wordmark', 'Wordmark']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={kind === id} className={kind === id ? 'sp-seg-on' : ''} onClick={() => setKind(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="sp-tiles">
          {tiles.map((t) => (
            <div key={t.name} className="sp-tile" style={{ background: t.bg }}>
              <img src={`/brand/routicle-${kind}-${t.file}.svg`} alt={`Routicle ${kind} ${t.name.toLowerCase()}`} className={kind === 'mark' ? 'sp-tile-mark' : 'sp-tile-word'} />
              <span style={{ color: ink(t.bg) }}>{t.name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section label="Colour">
        <div className="sp-swatches">
          {page.palette.map((c) => (
            <button key={c.hex} type="button" className="sp-swatch" onClick={() => copy(c.hex)} style={{ background: c.hex, color: ink(c.hex) }} aria-label={`Copy ${c.name} ${c.hex}`}>
              <span className="sp-swatch-note">{c.note}</span>
              <span className="sp-swatch-name">{c.name}</span>
              <span className="sp-swatch-hex">{copied === c.hex ? 'Copied' : c.hex}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section label="Typeface">
        <div className="sp-card sp-type">
          <div className="sp-type-aa" aria-hidden="true">Aa</div>
          <div className="sp-type-body">
            <h3>Satoshi</h3>
            <p className="sp-type-set">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />abcdefghijklmnopqrstuvwxyz 0123456789</p>
            <div className="sp-type-weights">
              {[[400, 'Regular'], [500, 'Medium'], [700, 'Bold'], [900, 'Black']].map(([w, n]) => (
                <span key={w} style={{ fontWeight: w }}>{n}</span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <div className="sp-card sp-note">
          <p>{page.body}</p>
          <Link to="/contact" className="sp-link">Contact page <Arrow /></Link>
        </div>
      </Section>
    </>
  )
}

function Contact({ page }) {
  const [copied, copy] = useCopy()
  return (
    <>
      <Section>
        <div className="sp-card sp-mail">
          <span className="sp-mail-label">Email us</span>
          <a className="sp-mail-address" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <p>{page.note}</p>
          <div className="sp-actions">
            <a className="sp-btn sp-btn-primary" href={`mailto:${CONTACT_EMAIL}`}>Write to us <Arrow /></a>
            <button type="button" className="sp-btn sp-btn-ghost" onClick={() => copy(CONTACT_EMAIL)}>
              {copied === CONTACT_EMAIL ? <><Check /> Copied</> : 'Copy address'}
            </button>
          </div>
        </div>
      </Section>

      <Section label="Or start here">
        <div className="sp-routes">
          {page.routes.map((r) => {
            const inner = (
              <>
                <h3>{r.title}</h3>
                <p>{r.body}</p>
                <span className="sp-link">{r.cta} <Arrow /></span>
              </>
            )
            return r.mail ? (
              <a key={r.title} href={`mailto:${CONTACT_EMAIL}`} className="sp-card sp-route">{inner}</a>
            ) : (
              <Link key={r.title} to={r.to} className="sp-card sp-route">{inner}</Link>
            )
          })}
        </div>
      </Section>
    </>
  )
}

function Blog({ page }) {
  const { currentUser } = useApp()
  return (
    <>
      <Section>
        <div className="sp-posts" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="sp-card sp-post">
              <span className="sp-post-tag">{page.topics[i]}</span>
              <span className="sp-bar sp-bar-lg" />
              <span className="sp-bar" />
              <span className="sp-bar sp-bar-sm" />
              <span className="sp-post-soon">Coming soon</span>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        {currentUser ? (
          <div className="sp-card sp-note">
            <p>In the meantime, product changes are posted in What's new.</p>
            <Link to="/updates" className="sp-link">See what's new <Arrow /></Link>
          </div>
        ) : (
          <div className="sp-signup">
            <NewsletterSignup variant="band" source="blog" />
          </div>
        )}
      </Section>
    </>
  )
}

function Help({ page }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(0)
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? page.faq.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)) : page.faq
  }, [query, page.faq])

  return (
    <>
      <Section>
        <label className="sp-search">
          <SearchIcon size={16} color="currentColor" />
          <input type="search" value={query} placeholder="Search the questions" onChange={(e) => { setQuery(e.target.value); setOpen(0) }} aria-label="Search the questions" />
        </label>

        {shown.length === 0 ? (
          <div className="sp-card sp-note">
            <p>Nothing matches “{query}”. Try a different word, or ask us directly.</p>
            <Link to="/contact" className="sp-link">Contact us <Arrow /></Link>
          </div>
        ) : (
          <div className="sp-faq">
            {shown.map((f, i) => {
              const on = open === i
              return (
                <div key={f.q} className={on ? 'sp-card sp-qa sp-qa-on' : 'sp-card sp-qa'}>
                  <button type="button" className="sp-qa-q" aria-expanded={on} aria-controls={`faq-${i}`} onClick={() => setOpen(on ? -1 : i)}>
                    <span>{f.q}</span>
                    <span className="sp-qa-icon"><ChevronDownIcon size={16} color="currentColor" /></span>
                  </button>
                  <div className="sp-qa-a" id={`faq-${i}`} role="region">
                    <div>
                      <p>{f.a}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </>
  )
}

function Legal({ page }) {
  return (
    <>
      <Section>
        <div className="sp-notice" role="note">
          <span className="sp-notice-tag">Pre-launch</span>
          <p>{page.notice}</p>
        </div>
      </Section>

      <Section label={page.intro.replace(/:$/, '')}>
        <div className={page.points.length === 4 ? 'sp-points sp-points-2' : 'sp-points'}>
          {page.points.map((p, i) => (
            <div key={p.title} className="sp-card sp-point">
              <span className="sp-point-n">{i + 1}</span>
              <div>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}

const LAYOUTS = { about: About, careers: Careers, brand: Brand, contact: Contact, blog: Blog, help: Help, legal: Legal }

/* ------------------------------------------------------------------ page */

export default function StaticPage({ slug }) {
  const page = getStaticPage(slug)

  if (!page) {
    return (
      <div className="sp">
        <header className="sp-hero">
          <h1 className="sp-title">Page not found</h1>
          <div className="sp-actions sp-actions-center">
            <Link to="/" className="sp-btn sp-btn-primary">Back to Routicle</Link>
          </div>
        </header>
      </div>
    )
  }

  const Layout = LAYOUTS[page.layout]

  return (
    <article className={`sp sp-${page.layout}`}>
      <div className="sp-inner">
        <SubNav slug={slug} />

        <header className="sp-hero">
          <span className="sp-eyebrow"><span className="sp-eyebrow-dot" aria-hidden="true" />{page.eyebrow}</span>
          <h1 className="sp-title"><Title title={page.title} accent={page.accent} /></h1>
          <p className="sp-lede">{page.lede}</p>
        </header>

        <Layout page={page} />

        {slug !== 'contact' && (
          <Reveal as="section" className="sp-section">
            <div className="sp-cta">
              <div>
                <h2>Still have a question?</h2>
                <p>Email us and a person will get back to you.</p>
              </div>
              <div className="sp-actions">
                <Link to="/contact" className="sp-btn sp-btn-primary">Contact us <Arrow /></Link>
                {slug !== 'help' && <Link to="/help" className="sp-btn sp-btn-ghost">Help Center</Link>}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </article>
  )
}
