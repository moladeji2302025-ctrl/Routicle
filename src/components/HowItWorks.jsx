import PinnedSection, { reveal } from './PinnedSection'
import { UploadIcon, SparkleIcon, HeartIcon } from './icons'

const STEPS = [
  {
    icon: UploadIcon,
    label: 'Upload',
    desc: 'Add every format the piece comes in: PSD, AI, Canva, After Effects, Premiere or Figma. We work out the tier for you.',
  },
  {
    icon: SparkleIcon,
    label: 'Get Reviewed',
    desc: 'An admin checks it is really yours and ready to reuse before it goes live in the library.',
  },
  {
    icon: HeartIcon,
    label: 'Get Paid',
    desc: 'Every month, half of all subscription money is split between creators, and they keep the rights to their work.',
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
