import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { SHOWCASE_SLIDES } from '../data/showcaseSlides'
import { formatCount } from '../utils/format'
import { HeartIcon } from './icons'

const INTERVAL_MS = 4200

export default function ShowcaseCarousel() {
  const { contentItems } = useApp()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SHOWCASE_SLIDES.length)
    }, INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const active = SHOWCASE_SLIDES[index]
  const activeId = contentItems.find((item) => item.title === active.title)?.id

  return (
    <div className="showcase-panel-right">
      <Link to={activeId ? `/design/${activeId}` : '/explore'} className="showcase-visual">
        {SHOWCASE_SLIDES.map((slide, i) => (
          <img
            key={slide.image}
            src={slide.image}
            alt=""
            className={i === index ? 'showcase-visual-image is-active' : 'showcase-visual-image'}
          />
        ))}

        <div className="showcase-visual-footer">
          <div className="showcase-visual-info">
            <span className="showcase-visual-title">{active.title}</span>
            <span className="showcase-visual-creator">{active.creator}</span>
          </div>
          <span className="showcase-visual-stat">
            <HeartIcon size={12} color="currentColor" />
            {formatCount(active.appreciations)}
          </span>
        </div>
      </Link>

      <div className="showcase-dots">
        {SHOWCASE_SLIDES.map((slide, i) => (
          <span key={slide.image} className={i === index ? 'showcase-dot is-active' : 'showcase-dot'} />
        ))}
      </div>
    </div>
  )
}
