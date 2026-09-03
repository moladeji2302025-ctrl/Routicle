import { Link } from 'react-router-dom'
import Reveal from './Reveal'

const ITEMS = [
  { n: '01', label: 'Browse the Library', to: '/explore', desc: 'Real, finished design and video work from real creators.' },
  { n: '02', label: 'Generate with AI', to: '/studio/image', desc: 'Image and Video Studio built into every paid plan.' },
  { n: '03', label: 'Become a Creator', to: '/become-creator', desc: 'Upload what you already made. Get paid every month.' },
  { n: '04', label: 'Simple Pricing', to: '/pricing', desc: 'Free to browse. Subscribe or pay per download.' },
]

export default function SiteOverview() {
  return (
    <section className="overview-deck">
      <Reveal className="overview-deck-head">
        <h2 className="deck-heading">What's Inside</h2>
        <div className="deck-accent" aria-hidden="true" />
      </Reveal>

      <div className="overview-deck-grid">
        {ITEMS.map((item, i) => (
          <Reveal key={item.n} delay={i * 70} className="overview-deck-row">
            <span className="overview-deck-num">{item.n}</span>
            <div className="overview-deck-text">
              <Link to={item.to} className="overview-deck-label">{item.label}</Link>
              <p className="overview-deck-desc">{item.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
