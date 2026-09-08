import PinnedSection, { reveal } from './PinnedSection'
import { UploadIcon, SparkleIcon, HeartIcon } from './icons'

const STEPS = [
  {
    icon: UploadIcon,
    label: 'Upload',
    desc: 'Bundle every format a piece includes — PSD, AI, Canva, After Effects, Premiere, Figma. Tier is derived automatically.',
  },
  {
    icon: SparkleIcon,
    label: 'Get Reviewed',
    desc: 'An admin checks it is really yours and ready to reuse before it goes live in the library.',
  },
  {
    icon: HeartIcon,
    label: 'Get Paid',
    desc: 'Half of every subscription dollar is pooled and split among creators, every month, non-exclusively.',
  },
]

export default function HowItWorks() {
  return (
    <PinnedSection className="works-deck">
      {(shown) => (
        <>
          <div className="works-deck-head">
            <h2 className="deck-heading">How It Works</h2>
            <div className="deck-accent" aria-hidden="true" />
          </div>

          <div className="works-deck-list">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.label} {...reveal(shown, i, 'works-deck-row')}>
                  <span className="works-deck-icon">
                    <Icon size={20} color="currentColor" />
                  </span>
                  <div>
                    <h3 className="works-deck-label">{step.label}</h3>
                    <p className="works-deck-desc">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </PinnedSection>
  )
}
