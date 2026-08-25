import Reveal from './Reveal'

const ROWS = [
  {
    label: 'Unused work',
    before: 'Sits on a laptop or drive, earning nothing',
    after: 'Uploaded once, keeps earning every month it’s downloaded',
  },
  {
    label: 'File access',
    before: 'Screenshots or flattened exports only',
    after: 'Real PSD, AI, Canva, and video project files',
  },
  {
    label: 'Creator recognition',
    before: 'Anonymous contributor pool',
    after: 'Every file carries its creator’s name and story',
  },
  {
    label: 'AI generation',
    before: 'A separate subscription for AI tools',
    after: 'Image & Video Studio built into the same plan',
  },
  {
    label: 'Licensing',
    before: 'Often exclusive — you lose usage rights',
    after: 'Non-exclusive — keep every right you already have',
  },
]

export default function Comparison() {
  return (
    <section className="comparison">
      <h2 className="comparison-title">
        Built for the work
        <br />
        you already made
      </h2>

      <div className="comparison-table">
        <div className="comparison-head">
          <div />
          <div className="comparison-head-cell comparison-head-before">Without Routicle</div>
          <div className="comparison-head-cell comparison-head-after">
            <img src="/brand/routicle-mark-black.svg" alt="" className="comparison-head-icon" />
            Routicle
          </div>
        </div>

        {ROWS.map((row, i) => (
          <Reveal key={row.label} delay={i * 60} className={`comparison-row${i % 2 === 1 ? ' comparison-row-alt' : ''}`}>
            <div className="comparison-label">{row.label}</div>
            <div className="comparison-before">{row.before}</div>
            <div className="comparison-after">{row.after}</div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
