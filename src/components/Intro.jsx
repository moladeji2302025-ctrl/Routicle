import PinnedSection, { stage } from './PinnedSection'

export default function Intro() {
  return (
    <PinnedSection className="intro-deck">
      {(p) => (
        <>
          <div className="intro-deck-media" style={stage(p, 0.04, 0.44, 32)}>
            <img src="/images/t9.jpg" alt="" />
          </div>

          <div className="intro-deck-text">
            <div>
              <h2 className="deck-heading">What Routicle Is</h2>
              <div className="deck-accent" aria-hidden="true" />
            </div>

            <p className="intro-deck-lead" style={stage(p, 0.12, 0.5)}>
              Most finished creative work only ever gets used once — then it sits on a drive,
              earning nothing.
            </p>

            <p className="intro-deck-body" style={stage(p, 0.3, 0.72)}>
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
