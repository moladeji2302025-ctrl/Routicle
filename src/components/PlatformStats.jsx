import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { DEPARTMENTS, departmentLabel } from '../data/departments'
import Reveal from './Reveal'

const DONUT_COLORS = ['var(--brand-violet)', 'var(--brand-purple)', 'var(--brand-lavender)', 'oklch(0.5 0.02 290)', 'oklch(0.35 0.02 290)']

const PROGRESS = [
  { label: 'Founding Creator Recruitment', pct: 100 },
  { label: 'Warm-Start Library', pct: 100 },
  { label: 'Public Launch', pct: 65 },
]

const RADIUS = 70
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function PlatformStats() {
  const { contentItems } = useApp()

  const breakdown = useMemo(() => {
    const approved = contentItems.filter((item) => item.moderationStatus === 'approved')
    const total = approved.length || 1
    return DEPARTMENTS.map((dept) => ({
      id: dept.id,
      label: dept.label,
      count: approved.filter((item) => item.department === dept.id).length,
      pct: approved.filter((item) => item.department === dept.id).length / total,
    })).filter((d) => d.count > 0)
  }, [contentItems])

  let offset = 0

  return (
    <section className="stats-deck">
      <div className="stats-deck-col">
        <Reveal>
          <h2 className="deck-heading">Library Mix</h2>
          <div className="deck-accent" aria-hidden="true" />
          <p className="stats-deck-intro">Approved uploads across the library, by department.</p>
        </Reveal>

        <Reveal delay={100} className="donut-wrap">
          <svg viewBox="0 0 180 180" className="donut-chart">
            <circle cx="90" cy="90" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="20" />
            {breakdown.map((d, i) => {
              const dash = d.pct * CIRCUMFERENCE
              const circle = (
                <circle
                  key={d.id}
                  cx="90"
                  cy="90"
                  r={RADIUS}
                  fill="none"
                  stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                  strokeWidth="20"
                  strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 90 90)"
                />
              )
              offset += dash
              return circle
            })}
          </svg>
          <div className="donut-legend">
            {breakdown.map((d, i) => (
              <div key={d.id} className="donut-legend-row">
                <span className="donut-legend-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                {departmentLabel(d.id)}
                <span className="donut-legend-pct">{Math.round(d.pct * 100)}%</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <div className="stats-deck-col">
        <Reveal>
          <h2 className="deck-heading">Where We Are</h2>
          <div className="deck-accent" aria-hidden="true" />
        </Reveal>

        <div className="progress-list">
          {PROGRESS.map((p, i) => (
            <Reveal key={p.label} delay={i * 90} className="progress-row">
              <span className="progress-label">{p.label}</span>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${p.pct}%` }} />
              </div>
              <span className="progress-pct">{p.pct}%</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
