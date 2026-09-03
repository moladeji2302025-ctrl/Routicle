import { Link } from 'react-router-dom'
import Reveal from './Reveal'

export default function FooterCta() {
  return (
    <section className="footer-cta">
      <div className="glow glow-cta" aria-hidden="true" />
      <Reveal as="div" className="footer-cta-content">
        <span className="footer-cta-tag">Ready when you are</span>
        <h2 className="footer-cta-title">Where Unused Work Earns</h2>
        <div className="footer-cta-row">
          <Link to="/become-creator" className="hero-deck-btn-primary">
            Start earning <span aria-hidden="true">→</span>
          </Link>
          <Link to="/explore" className="hero-deck-btn-secondary">Browse the library</Link>
        </div>
      </Reveal>
    </section>
  )
}
