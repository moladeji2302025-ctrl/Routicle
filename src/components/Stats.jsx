import Reveal from './Reveal'

const STATS = [
  { number: '5', label: 'Departments' },
  { number: '500+', label: 'Launch files' },
  { number: '25', label: 'Founding creators' },
  { number: '50%', label: 'Creator share' },
  { number: '2', label: 'AI Studios' },
  { number: '$50', label: 'Min. payout' },
]

export default function Stats() {
  return (
    <section className="stats">
      <Reveal className="stats-intro">
        <span className="stats-eyebrow">What we've built</span>
        <h2 className="stats-title">Growing, one upload at a time</h2>
      </Reveal>

      <div className="stats-row">
        {STATS.map((stat, i) => (
          <Reveal key={stat.label} delay={i * 60} className="stats-item">
            <span className="stats-number">{stat.number}</span>
            <span className="stats-label">{stat.label}</span>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
