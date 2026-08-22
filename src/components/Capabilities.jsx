import { ImageIcon, VideoIcon, PenIcon, SparkleIcon } from './icons'
import Reveal from './Reveal'

const MINI_TABS = ['All', 'Design', 'Video', 'AI']

const MINI_TILES = [
  { image: '/images/t1.jpg', label: 'Graphic Design', icon: ImageIcon },
  { image: '/images/t2.jpg', label: 'Motion', icon: VideoIcon },
  { image: '/images/t3.jpg', label: 'AI Image', icon: SparkleIcon },
  { image: '/images/t4.jpg', label: 'Illustration', icon: PenIcon },
]

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
        <a href="#" className="capabilities-cta">
          Start browsing <span aria-hidden="true">→</span>
        </a>
      </div>

      <div className="bento-grid">
        <Reveal className="bento-card bento-tall" delay={0}>
          <h3 className="bento-title">Every format, ready to go</h3>
          <p className="bento-desc">
            Design files, motion projects, AI images — dozens of formats, organized by department,
            no conversion needed.
          </p>

          <div className="mini-app">
            <div className="mini-app-tabs">
              {MINI_TABS.map((tab, i) => (
                <span key={tab} className={i === 0 ? 'mini-app-tab mini-app-tab-active' : 'mini-app-tab'}>
                  {tab}
                </span>
              ))}
            </div>
            <div className="mini-app-grid">
              {MINI_TILES.map((tile) => {
                const Icon = tile.icon
                return (
                  <div key={tile.label} className="mini-app-tile">
                    <img src={tile.image} alt="" className="mini-app-tile-image" />
                    <span className="mini-app-tile-label">
                      <Icon size={11} color="currentColor" />
                      {tile.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </Reveal>

        <Reveal className="bento-card bento-wide" delay={90}>
          <h3 className="bento-title">Every upload has a name behind it</h3>
          <p className="bento-desc">
            Not anonymous stock. Every file carries its creator's story — browse by department, or
            follow the people making it.
          </p>

          <div className="bento-network">
            <svg className="bento-network-line" viewBox="0 0 400 140" preserveAspectRatio="none">
              <path d="M40,100 C140,20 260,120 360,40" fill="none" stroke="oklch(1 0 0 / 0.25)" strokeWidth="1.5" strokeDasharray="4 6" />
            </svg>
            <div className="bento-network-node bento-network-node-a">
              <img src="/images/t6.jpg" alt="" />
              <span className="bento-network-tag">Zainab R.</span>
            </div>
            <div className="bento-network-node bento-network-node-b">
              <img src="/images/t9.jpg" alt="" />
              <span className="bento-network-tag">Yemi S.</span>
            </div>
          </div>
        </Reveal>

        <Reveal className="bento-card bento-maroon" delay={160}>
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

        <Reveal className="bento-card bento-teal" delay={230}>
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
