import { useEffect, useState } from 'react'
import { HeartIcon } from './icons'
import { SHOWCASE_SLIDES } from '../data/showcaseSlides'

const INTERVAL_MS = 4200
const PEEK_PX = 86

export default function ShowcaseCarousel() {
  const [index, setIndex] = useState(0)
  const [blurred, setBlurred] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SHOWCASE_SLIDES.length)
      setBlurred(true)
      setTimeout(() => setBlurred(false), 160)
    }, INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const active = SHOWCASE_SLIDES[index]

  return (
    <div className="showcase-panel-right">
      <div className="carousel-viewport">
        <div
          className="carousel-track"
          style={{
            transform: `translateX(calc((-100% + ${PEEK_PX}px) * ${index}))`,
            filter: blurred ? 'blur(6px)' : 'blur(0px)',
          }}
        >
          {SHOWCASE_SLIDES.map((slide) => (
            <div key={slide.image} className="carousel-card">
              <img src={slide.image} alt="" className="carousel-card-image" />
            </div>
          ))}
        </div>
      </div>

      <div className="carousel-dots">
        {SHOWCASE_SLIDES.map((slide, i) => (
          <span key={slide.image} className={i === index ? 'carousel-dot carousel-dot-active' : 'carousel-dot'} />
        ))}
      </div>

      <div className="showcase-floating-card">
        <div className="floating-card-header">
          <span className="floating-card-label">Tools</span>
          <span className="floating-card-heading">Download</span>
        </div>

        <div className="floating-card-preview">
          <img src={active.avatar} alt="" className="floating-avatar" />
          <div className="floating-preview-text">
            <div className="floating-preview-title">{active.title}</div>
            <div className="floating-preview-creator">{active.creator}</div>
          </div>
          <span className="floating-appreciate">
            <HeartIcon size={12} color="currentColor" />
            {active.appreciations}
          </span>
        </div>

        <div className="floating-card-footer">
          <div className="floating-formats">
            {active.fileTypes.length > 0 ? (
              active.fileTypes.map((ft) => (
                <span key={ft} className="floating-format-badge">{ft}</span>
              ))
            ) : (
              <span className="floating-format-badge">AI-Generated</span>
            )}
          </div>
          <span className="floating-tier">{active.tier}</span>
        </div>
      </div>
    </div>
  )
}
