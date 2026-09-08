import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { DEPARTMENTS, departmentLabel } from '../data/departments'
import { useTimeline, easeOutCubic } from '../hooks/useTimeline'
import PinnedSection, { stage } from './PinnedSection'

const DONUT_COLORS = ['var(--brand-violet)', 'var(--brand-purple)', 'var(--brand-lavender)', 'oklch(0.5 0.02 290)', 'oklch(0.35 0.02 290)']

const PROGRESS = [
  { label: 'Founding Creator Recruitment', pct: 100 },
  { label: 'Warm-Start Library', pct: 100 },
  { label: 'Public Launch', pct: 65 },
]

const RADIUS = 70
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const DONUT_MS = 1700
const BARS_MS = 1500
/** Fraction of the bar timeline each row waits before starting, and how long its own fill takes. */
const ROW_STAGGER = 0.16
const ROW_SPAN = 0.58

const clamp01 = (n) => Math.max(0, Math.min(1, n))

function systemReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export default function PlatformStats() {
  const { contentItems, settings } = useApp()
  const still = settings.appearance.reduceMotion || systemReducedMotion()

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

  return (
    <PinnedSection className="stats-deck" pinLength="180vh">
      {(p) => <StatsBody p={p} still={still} breakdown={breakdown} />}
    </PinnedSection>
  )
}

/**
 * Split out so the clocks can be hooks: they start from the section's own
 * scroll position rather than a viewport intersection, so the numbers don't
 * finish counting behind an element that hasn't faded in yet.
 */
function StatsBody({ p, still, breakdown }) {
  const donutClock = useTimeline(p > 0.1, still ? 0 : DONUT_MS)
  const barsClock = useTimeline(p > 0.3, still ? 0 : BARS_MS)

  // The ring is drawn as a single continuous sweep: every segment's share sums
  // to 1, so eased clock time maps straight onto arc length travelled, and each
  // segment simply draws whatever part of that sweep falls inside its own span.
  const sweep = easeOutCubic(donutClock)
  const sweptLength = sweep * CIRCUMFERENCE
  let cursor = 0

  return (
    <>
      <div className="stats-deck-col">
        <div>
          <h2 className="deck-heading">Library Mix</h2>
          <div className="deck-accent" aria-hidden="true" />
          <p className="stats-deck-intro">Approved uploads across the library, by department.</p>
        </div>

        <div className="donut-wrap" style={stage(p, 0.06, 0.4, 28)}>
          <svg viewBox="0 0 180 180" className="donut-chart" aria-hidden="true">
            <circle cx="90" cy="90" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="20" />
            {breakdown.map((d, i) => {
              const dash = d.pct * CIRCUMFERENCE
              const drawn = clamp01((sweptLength - cursor) / dash) * dash
              const segment = (
                <circle
                  key={d.id}
                  cx="90"
                  cy="90"
                  r={RADIUS}
                  fill="none"
                  stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                  strokeWidth="20"
                  strokeDasharray={`${drawn} ${CIRCUMFERENCE - drawn}`}
                  strokeDashoffset={-cursor}
                  transform="rotate(-90 90 90)"
                />
              )
              cursor += dash
              return segment
            })}
          </svg>

          <div className="donut-legend">
            {breakdown.map((d, i) => (
              <div key={d.id} className="donut-legend-row">
                <span className="donut-legend-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                {departmentLabel(d.id)}
                <span className="donut-legend-pct">{Math.round(d.pct * 100 * sweep)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="stats-deck-col">
        <div>
          <h2 className="deck-heading">Where We Are</h2>
          <div className="deck-accent" aria-hidden="true" />
        </div>

        <div className="progress-list">
          {PROGRESS.map((row, i) => {
            // Offset this row's window out of the shared clock *before* easing —
            // easing first and shifting after would flatten the curve's tail.
            const rowT = easeOutCubic(clamp01((barsClock - i * ROW_STAGGER) / ROW_SPAN))
            const filled = row.pct * rowT
            return (
              <div key={row.label} className="progress-row" style={stage(p, 0.24 + i * 0.1, 0.58 + i * 0.1)}>
                <span className="progress-label">{row.label}</span>
                <div className="progress-track">
                  <div
                    className={rowT > 0 && rowT < 1 ? 'progress-fill progress-fill-active' : 'progress-fill'}
                    style={{ width: `${filled}%` }}
                  />
                </div>
                <span className="progress-pct">{Math.round(filled)}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
