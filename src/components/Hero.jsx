import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section className="hero-behance">
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
    </section>
  )
}
