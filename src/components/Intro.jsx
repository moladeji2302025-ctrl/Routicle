import Reveal from './Reveal'

export default function Intro() {
  return (
    <section className="intro-deck">
      <Reveal className="intro-deck-media">
        <img src="/images/t9.jpg" alt="" />
      </Reveal>

      <div className="intro-deck-text">
        <Reveal>
          <h2 className="deck-heading">What Routicle Is</h2>
          <div className="deck-accent" aria-hidden="true" />
        </Reveal>

        <Reveal delay={80}>
          <p className="intro-deck-lead">
            Most finished creative work only ever gets used once — then it sits on a drive,
            earning nothing.
          </p>
        </Reveal>

        <Reveal delay={140}>
          <p className="intro-deck-body">
            Routicle is a subscriber-share marketplace: creators upload real, finished design and
            video files they never got to reuse. Subscribers pay to download the source files
            behind them — not stock, not a flattened export, the real editable project. Half of
            every subscription dollar is pooled and paid out to creators every month,
            non-exclusively, with no rights given up.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
