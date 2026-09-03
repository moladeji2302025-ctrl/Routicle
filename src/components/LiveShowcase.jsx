import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Reveal from './Reveal'
import { departmentLabel } from '../data/departments'

const INTERVAL_MS = 6000
const GRID_SIZE = 4

export default function LiveShowcase() {
  const { contentItems, currentUser } = useApp()
  const navigate = useNavigate()
  const approved = contentItems.filter((item) => item.moderationStatus === 'approved')

  const slides = useMemo(() => {
    const chunks = []
    for (let i = 0; i < approved.length; i += GRID_SIZE) {
      const chunk = approved.slice(i, i + GRID_SIZE)
      if (chunk.length === GRID_SIZE) chunks.push(chunk)
    }
    return chunks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approved.length])

  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (slides.length < 2) return undefined
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), INTERVAL_MS)
    return () => clearInterval(id)
  }, [slides.length])

  if (slides.length === 0) return null
  const slide = slides[index % slides.length]

  function openProject(item) {
    navigate(currentUser ? `/design/${item.id}` : '/signup')
  }

  return (
    <section className="showcase-deck">
      <div className="showcase-deck-text">
        <Reveal>
          <h2 className="deck-heading">Showcase</h2>
          <div className="deck-accent" aria-hidden="true" />
        </Reveal>

        <Reveal delay={80} className="showcase-deck-num">
          {String(index + 1).padStart(2, '0')}
          <span className="showcase-deck-num-total"> / {String(slides.length).padStart(2, '0')}</span>
        </Reveal>

        <Reveal delay={120}>
          <p className="showcase-deck-desc">
            A rotating look at real, finished work from the library — sign in to view any project
            in full and download the source files behind it.
          </p>
        </Reveal>

        <Reveal delay={160} className="showcase-deck-cta-row">
          <Link to="/explore" className="hero-deck-btn-secondary">Explore the library</Link>
        </Reveal>
      </div>

      <Reveal delay={100} className="showcase-grid-reveal">
        {/* Keyed on the slide index so only this inner track replays the
            glide-in animation on rotation — the outer Reveal above stays
            mounted once, so its own scroll-reveal never resets. */}
        <div className="showcase-grid" key={index}>
          {slide.map((item, i) => (
            <button
              type="button"
              key={item.id}
              className={`showcase-grid-tile showcase-grid-tile-${i}`}
              onClick={() => openProject(item)}
            >
              <img src={item.image} alt={item.title} />
              <span className="showcase-grid-dept">{departmentLabel(item.department)}</span>
              <span className="showcase-grid-credit">
                <img src={item.avatar} alt="" className="showcase-grid-avatar" />
                <span>
                  <span className="showcase-grid-title">{item.title}</span>
                  <span className="showcase-grid-creator">by {item.creator}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </Reveal>
    </section>
  )
}
