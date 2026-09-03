import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Reveal from './Reveal'
import { HeartIcon } from './icons'
import { formatCount } from '../utils/format'
import { departmentLabel } from '../data/departments'

const INTERVAL_MS = 4800

export default function LiveShowcase() {
  const { contentItems } = useApp()
  const approved = contentItems.filter((item) => item.moderationStatus === 'approved')
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (approved.length < 2) return undefined
    const id = setInterval(() => setIndex((i) => (i + 1) % approved.length), INTERVAL_MS)
    return () => clearInterval(id)
  }, [approved.length])

  if (approved.length === 0) return null
  const active = approved[index % approved.length]

  return (
    <section className="showcase-deck">
      <div className="showcase-deck-text">
        <Reveal>
          <h2 className="deck-heading">Showcase</h2>
          <div className="deck-accent" aria-hidden="true" />
        </Reveal>

        <Reveal delay={80} className="showcase-deck-num">
          {String((index % approved.length) + 1).padStart(2, '0')}
        </Reveal>

        <Reveal delay={120}>
          <h3 className="showcase-deck-title">{active.title}</h3>
          <p className="showcase-deck-desc">
            {departmentLabel(active.department)} — by {active.creator}
            {active.fileTypes.length > 0 && ` — ${active.fileTypes.join(', ')}`}
          </p>
          <Link to="/explore" className="showcase-deck-link">See the full library →</Link>
        </Reveal>
      </div>

      <Reveal className="showcase-deck-media">
        <Link to={`/design/${active.id}`}>
          <img src={active.image} alt={active.title} />
          <div className="showcase-deck-stat">
            <HeartIcon size={12} color="currentColor" />
            {formatCount(active.appreciations)}
          </div>
        </Link>
      </Reveal>
    </section>
  )
}
