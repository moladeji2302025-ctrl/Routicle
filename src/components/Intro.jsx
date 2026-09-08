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
              Most finished creative work only ever gets used once — then it sits on a drive,
              earning nothing.
            </p>

            <p {...reveal(shown, 2, 'intro-deck-body')}>
              Routicle is a subscriber-share marketplace: creators upload real, finished design and
              video files they never got to reuse. Subscribers pay to download the source files
              behind them — not stock, not a flattened export, the real editable project. Half of
              every subscription dollar is pooled and paid out to creators every month,
              non-exclusively, with no rights given up.
            </p>
          </div>
        </>
      )}
    </PinnedSection>
  )
}
