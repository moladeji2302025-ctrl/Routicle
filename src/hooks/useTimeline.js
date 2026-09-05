import { useEffect, useRef, useState } from 'react'

export const easeOutCubic = (t) => 1 - (1 - t) ** 3

/**
 * Ramps linearly 0 → 1 over `duration` once `active` turns true, driven by rAF.
 *
 * Deliberately one clock for a whole section rather than a timer per value:
 * separate timers start on separate frames and drift apart, and the donut's
 * sweep has to stay exactly in step with the legend percentages labelling it.
 * Callers ease the raw value themselves, so staggered children can offset
 * their slice of the timeline before easing it (easing first, then offsetting,
 * distorts the curve).
 *
 * `duration <= 0` resolves to 1 on the spot — that's the reduced-motion path.
 */
export function useTimeline(active, duration = 1500) {
  const [progress, setProgress] = useState(0)
  const frameRef = useRef(0)

  useEffect(() => {
    if (!active) return undefined
    if (duration <= 0) {
      setProgress(1)
      return undefined
    }

    let startedAt = null
    const step = (now) => {
      if (startedAt === null) startedAt = now
      const t = Math.min(1, (now - startedAt) / duration)
      setProgress(t)
      if (t < 1) frameRef.current = requestAnimationFrame(step)
    }

    frameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameRef.current)
  }, [active, duration])

  return progress
}
