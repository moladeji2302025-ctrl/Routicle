import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function Hero() {
  const { contentItems } = useApp()
  const approved = contentItems.filter((item) => item.moderationStatus === 'approved')
  const gallery = approved.slice(0, 8).map((item) => item.image)
  // Pad out with a repeat if the library has fewer than 8 approved items yet.
  while (gallery.length > 0 && gallery.length < 8) gallery.push(gallery[gallery.length % approved.length])

  const left = gallery.slice(0, 4)
  const right = gallery.slice(4, 8)

  return (
    <section className="hero-behance">
      {left.length === 4 && (
        <div className="hero-behance-cluster hero-behance-cluster-left" aria-hidden="true">
          {left.map((src, i) => (
            <div key={i} className={`hero-behance-card hero-behance-card-${i}`}>
              <img src={src} alt="" />
            </div>
          ))}
        </div>
      )}

      <div className="hero-behance-text">
        <h1 className="hero-behance-title">
          Your Unused Work
          <br />
          <span className="hero-behance-accent">Finally Earns.</span>
        </h1>
        <p className="hero-behance-subtitle">
          A comprehensive marketplace for creators to turn finished-but-unused designs and video
          into a real, recurring income — and for subscribers to download the source files behind
          them.
        </p>
        <div className="hero-behance-cta-row">
          <Link to="/explore" className="hero-deck-btn-primary">Browse the library</Link>
          <Link to="/become-creator" className="hero-deck-btn-secondary">Become a Creator</Link>
        </div>
      </div>

      {right.length === 4 && (
        <div className="hero-behance-cluster hero-behance-cluster-right" aria-hidden="true">
          {right.map((src, i) => (
            <div key={i} className={`hero-behance-card hero-behance-card-${i}`}>
              <img src={src} alt="" />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
