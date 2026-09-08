import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import PinnedSection, { stage } from './PinnedSection'
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
    <PinnedSection className="showcase-deck">
      {(p) => (
        <>
          <div className="showcase-deck-text">
            <div>
              <h2 className="deck-heading">Showcase</h2>
              <div className="deck-accent" aria-hidden="true" />
            </div>

            <span className="showcase-deck-num" style={stage(p, 0.08, 0.42)}>
              {String(index + 1).padStart(2, '0')}
              <span className="showcase-deck-num-total"> / {String(slides.length).padStart(2, '0')}</span>
            </span>

            <p className="showcase-deck-desc" style={stage(p, 0.18, 0.55)}>
              A rotating look at real, finished work from the library — sign in to view any project
              in full and download the source files behind it.
            </p>

            <div className="showcase-deck-cta-row" style={stage(p, 0.34, 0.7)}>
              <Link to="/explore" className="hero-deck-btn-secondary">Explore the library</Link>
            </div>
          </div>

          <div className="showcase-grid-reveal" style={stage(p, 0.12, 0.55, 32)}>
            {/* Keyed on the slide index so only this inner track replays the
                glide-in animation on rotation — the wrapper above keeps whatever
                scroll-staged transform it currently has. */}
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
          </div>
        </>
      )}
    </PinnedSection>
  )
}
