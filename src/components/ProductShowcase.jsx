import { Link } from 'react-router-dom'
import { ImageIcon, VideoIcon, PenIcon, SparkleIcon } from './icons'
import ShowcaseCarousel from './ShowcaseCarousel'
import Reveal from './Reveal'

const FEATURES = [
  {
    id: 'graphic-design',
    label: 'Graphic Design',
    icon: ImageIcon,
    desc: 'Templates, decks, and social graphics — ready to open in Canva, Illustrator, or Photoshop.',
    to: '/explore?department=graphic-design',
    active: true,
  },
  {
    id: 'motion-graphics',
    label: 'Motion Graphics',
    icon: VideoIcon,
    to: '/explore?department=motion-graphics',
  },
  {
    id: 'illustration',
    label: 'Illustration',
    icon: PenIcon,
    to: '/explore?department=illustration',
  },
  {
    id: 'ai-generation',
    label: 'AI Image & Video Studio',
    icon: SparkleIcon,
    to: '/studio/image',
  },
]

export default function ProductShowcase() {
  return (
    <section className="showcase">
      <div className="showcase-intro">
        <h2 className="showcase-title">Everything creative, in one subscription</h2>
        <p className="showcase-subtitle">
          Browse real, finished work from real creatives — or generate something new yourself,
          right inside Routicle.
        </p>
      </div>

      <Reveal className="showcase-panel">
        <div className="showcase-panel-left">
          <h3 className="showcase-panel-title">Real work, ready to use</h3>
          <p className="showcase-panel-desc">
            Explore a growing library of finished design and video work — real files from real
            creators. Need something exact instead? Generate it yourself in the built-in AI Studio.
          </p>
          <Link to="/explore" className="showcase-tour-link">
            Take a tour <span aria-hidden="true">→</span>
          </Link>

          <div className="feature-list">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <Link
                  key={feature.id}
                  to={feature.to}
                  className={feature.active ? 'feature-item feature-item-active' : 'feature-item'}
                >
                  <div className="feature-item-head">
                    <Icon size={17} color="currentColor" />
                    <span>{feature.label}</span>
                  </div>
                  {feature.active && <p className="feature-desc">{feature.desc}</p>}
                </Link>
              )
            })}
          </div>
        </div>

        <ShowcaseCarousel />
      </Reveal>
    </section>
  )
}
