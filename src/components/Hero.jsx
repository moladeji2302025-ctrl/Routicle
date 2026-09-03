import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section className="hero-deck">
      <div className="glow glow-hero" aria-hidden="true" />

      <div className="hero-deck-top">
        <span className="hero-deck-brand">
          <img src="/brand/routicle-mark-white.svg" alt="" className="hero-deck-brand-icon" />
          Routicle
        </span>
        <Link to="/explore" className="hero-deck-arrow" aria-label="Browse the library">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M7 17L17 7M17 7H9M17 7v8" />
          </svg>
        </Link>
      </div>

      <div className="hero-deck-mid">
        <h1 className="hero-deck-title">
          Your Unused
          <br />
          Work
        </h1>
        <div className="hero-deck-accent" aria-hidden="true" />
        <p className="hero-deck-subtitle">
          Upload finished designs and video you never got to use. Subscribers download the real
          source files, you get paid every month — non-exclusive, no strings attached.
        </p>
        <div className="hero-deck-cta-row">
          <Link to="/explore" className="hero-deck-btn-primary">Browse the library</Link>
          <Link to="/become-creator" className="hero-deck-btn-secondary">Become a Creator</Link>
        </div>
      </div>

      <div className="hero-deck-bottom">
        <span className="hero-deck-tag">The subscriber-share creative library</span>
        <span className="hero-deck-link">routicle.app</span>
      </div>
    </section>
  )
}
