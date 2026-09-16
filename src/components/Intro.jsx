import PinnedSection, { reveal } from './PinnedSection'

export default function Intro() {
  return (
    <PinnedSection className="intro-deck">
      {(shown) => (
        <>
          <div {...reveal(shown, 0, 'intro-deck-media')}>
            <img src="/images/t9.jpg" alt="" />
          </div>

          <div className="intro-deck-text">
            <div>
              <h2 className="deck-heading">What Routicle Is</h2>
              <div className="deck-accent" aria-hidden="true" />
            </div>

            <p {...reveal(shown, 1, 'intro-deck-lead')}>
              Most finished creative work gets used once, then sits on a hard drive earning nothing.
            </p>

            <p {...reveal(shown, 2, 'intro-deck-body')}>
              Routicle is a marketplace where creators upload finished design and video files they never got to reuse. Subscribers pay to download the actual editable project files, not flattened exports. Half of every subscription dollar goes into a pool that's paid out to creators each month, and creators keep all the rights to their work.
            </p>
          </div>
        </>
      )}
    </PinnedSection>
  )
}
