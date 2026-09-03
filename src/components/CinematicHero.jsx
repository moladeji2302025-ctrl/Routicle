import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CinematicNav from './CinematicNav'
import CreatorTeaser from './CreatorTeaser'
import { SHOWCASE_HERO } from '../data/showcaseHero'
import { SOFTWARE } from '../data/software'

const INTERVAL_MS = 5500

export default function CinematicHero() {
  const [index, setIndex] = useState(0)
  const [teaserOpen, setTeaserOpen] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SHOWCASE_HERO.length)
    }, INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const active = SHOWCASE_HERO[index]

  function selectProject(i) {
    setIndex(i)
    setTeaserOpen(false)
  }

  return (
    <div className="cinematic-hero">
      {SHOWCASE_HERO.map((item, i) => (
        <img
          key={item.id}
          src={item.image}
          alt=""
          className={i === index ? 'cinematic-bg is-active' : 'cinematic-bg'}
        />
      ))}
      <div className="cinematic-scrim" />

      <CinematicNav />

      <div className="cinematic-main">
        <div className="cinematic-content">
          <span className="cinematic-eyebrow">The subscriber-share creative library</span>
          <h1 className="cinematic-title">
            Real Work,
            <br />
            Ready to Reuse
          </h1>
          <p className="cinematic-subtitle">
            Every file here is a finished project from a real creator — not stock, not AI filler.
            Subscribe once, download the source files behind work like this.
          </p>
        </div>

        <div className="cinematic-project-list">
          {SHOWCASE_HERO.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={i === index ? 'cinematic-project-item is-active' : 'cinematic-project-item'}
              onClick={() => selectProject(i)}
            >
              {i === index && <span className="cinematic-project-arrow" aria-hidden="true">▶</span>}
              {item.title}
            </button>
          ))}
        </div>

        <div className="cinematic-bottom-row">
          <div className="cinematic-creator-wrap">
            <button
              type="button"
              className="cinematic-creator-badge"
              onClick={() => setTeaserOpen((o) => !o)}
            >
              <span className="cinematic-creator-avatar">{active.creatorName.charAt(0)}</span>
              <span className="cinematic-creator-name">{active.creatorName}</span>
            </button>

            {teaserOpen && <CreatorTeaser item={active} onClose={() => setTeaserOpen(false)} />}
          </div>

          <div className="cinematic-bottom">
            <div className="cinematic-bottom-actions">
              <Link to="/explore" className="cinematic-discover-btn">
                Discover Routicle <span aria-hidden="true">→</span>
              </Link>
              <Link to="/become-creator" className="cinematic-secondary-btn">Become a Creator</Link>
            </div>

            <div className="cinematic-trust">
              <span className="cinematic-trust-line">Real creators, real files, non-exclusive</span>
              <div className="cinematic-trust-logos">
                {SOFTWARE.slice(0, 6).map((s) => (
                  <img key={s.name} src={s.icon} alt={s.name} title={s.name} className="cinematic-trust-logo" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="cinematic-dots">
        {SHOWCASE_HERO.map((item, i) => (
          <span key={item.id} className={i === index ? 'cinematic-dot is-active' : 'cinematic-dot'} />
        ))}
      </div>
    </div>
  )
}
