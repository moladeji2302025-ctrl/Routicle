import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import { getCreatorByName } from '../data/creators'

export default function Capabilities() {
  return (
    <section className="capabilities">
      <div className="capabilities-header">
        <div>
          <h2 className="capabilities-title">
            Browse first.
            <br />
            Unlock more when you're ready
          </h2>
          <p className="capabilities-subtitle">
            From casual browsing to full source files and AI generation — go at your own pace.
          </p>
        </div>
        <Link to="/explore" className="capabilities-cta">
          Start browsing <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="bento-grid">
        <Reveal className="bento-card bento-wide" delay={0}>
          <h3 className="bento-title">Every upload has a name behind it</h3>
          <p className="bento-desc">
            Not anonymous stock. Every file carries its creator's story — browse by department, or
            follow the people making it.
          </p>

          <div className="bento-network">
            <Link to={`/creator/${getCreatorByName('Zainab R.')?.id}`} className="bento-network-node bento-network-node-a">
              <img src="/images/t6.jpg" alt="" />
              <span className="bento-network-tag">Zainab R.</span>
            </Link>
            <Link to={`/creator/${getCreatorByName('Yemi S.')?.id}`} className="bento-network-node bento-network-node-b">
              <img src="/images/t9.jpg" alt="" />
              <span className="bento-network-tag">Yemi S.</span>
            </Link>
          </div>
        </Reveal>

        <Reveal className="bento-card bento-maroon" delay={90}>
          <h3 className="bento-title">One library, every department</h3>
          <p className="bento-desc">
            Graphic design, motion, illustration, and AI-generated work — organized, not scattered
            across folders.
          </p>
          <div className="bento-pair">
            <div className="bento-pair-tile">
              <img src="/images/t9.jpg" alt="" />
              <span>Brand Deck</span>
            </div>
            <div className="bento-pair-tile">
              <img src="/images/t5.jpg" alt="" />
              <span>Motion Reel</span>
            </div>
          </div>
        </Reveal>

        <Reveal className="bento-card bento-teal" delay={160}>
          <h3 className="bento-title">Download in one click</h3>
          <p className="bento-desc">
            Found the file you need? Pull the whole bundle — PSD, AI, Canva — in a single click.
          </p>
          <div className="bento-download-visual">
            <img src="/images/t7.jpg" alt="" />
            <span className="bento-download-pill">Download</span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
