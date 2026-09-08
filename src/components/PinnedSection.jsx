import { useEffect, useRef, useState } from 'react'

/**
 * Below either of these the hold is dropped and the section just flows: there
 * isn't the height to hold a screen's worth of content still, and a short
 * landscape phone would end up scrolling inside a clipped stage.
 */
const NO_PIN = '(max-width: 900px), (max-height: 640px)'

/**
 * A full-screen section that holds briefly as you scroll past it, and reveals
 * its contents in one triggered cascade.
 *
 * Deliberately *not* scroll-scrubbed: arriving fires the reveal, and the
 * elements then animate on their own clock. Tying opacity frame-by-frame to
 * scroll offset leaves elements frozen half-visible whenever the reader stops,
 * and rewinds them on the way back up.
 *
 * The cascade re-arms every time the section leaves the viewport, so it plays
 * again on the way back — the motion belongs to the scroll, not to page load.
 *
 * `children` is a render prop — `(revealed) => nodes`.
 */
export default function PinnedSection({ className = '', hold = '60vh', threshold = 0.55, children }) {
  const stageRef = useRef(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const node = stageRef.current
    if (!node) return undefined

    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return undefined
    }

    // Two thresholds, not one, to get hysteresis: the cascade plays once the
    // section is mostly on screen and only re-arms once it has left entirely.
    // A single threshold would re-trigger every time a scroll jittered across
    // it, and the section would stutter while you were still reading it.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= threshold) setRevealed(true)
        else if (entry.intersectionRatio === 0) setRevealed(false)
      },
      { threshold: [0, threshold] }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold])

  return (
    <section className="pinned-wrapper" style={{ '--pin-length': hold }}>
      <div className={`pinned-stage ${className}`} ref={stageRef}>
        {children(revealed)}
      </div>
    </section>
  )
}

/**
 * Props for one element in a section's cascade: `order` is its place in the
 * queue, and every element in a section is triggered by the same `revealed`
 * flag — the stagger is time, not scroll distance.
 */
export function reveal(revealed, order = 0, extra = '', step = 110) {
  return {
    className: `${extra} stage-item${revealed ? ' stage-item-in' : ''}`.trim(),
    style: { transitionDelay: revealed ? `${order * step}ms` : '0ms' },
  }
}

export { NO_PIN }
