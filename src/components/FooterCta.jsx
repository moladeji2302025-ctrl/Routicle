import { Link } from 'react-router-dom'
import Reveal from './Reveal'

export default function FooterCta() {
  return (
    <section className="footer-cta">
      <Reveal as="div" className="footer-cta-content">
        <h2 className="footer-cta-title">Where Unused Work Earns</h2>
        <Link to="/become-creator" className="footer-cta-button">
          Start earning <span aria-hidden="true">→</span>
        </Link>
      </Reveal>
    </section>
  )
}
