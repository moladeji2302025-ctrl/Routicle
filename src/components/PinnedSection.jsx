import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'

const clamp01 = (n) => Math.min(1, Math.max(0, n))

/**
 * Below either of these the pin is dropped and the section just flows: there
 * isn't the height to hold a screen's worth of content still, and a short
 * landscape phone would end up scrolling inside a clipped stage.
 */
const NO_PIN = '(max-width: 900px), (max-height: 640px)'

/**
 * A full-screen section that stays put while you scroll past it, handing its
 * children a 0 → 1 progress value so each element can stage itself in. The
 * footer CTA's mechanism, generalised: a wrapper taller than the viewport, and
 * a sticky child filling exactly one screen.
 *
 * `children` is a render prop — `(progress) => nodes`.
 */
export default function PinnedSection({ className = '', pinLength = '150vh', children }) {
  const wrapperRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const { settings } = useApp()
  const still = settings.appearance.reduceMotion

  useEffect(() => {
    if (still) {
      setProgress(1)
      return undefined
    }

    const mq = window.matchMedia(NO_PIN)
    let frame = null

    function measure() {
      frame = null
      const el = wrapperRef.current
      if (!el) return

      // Unpinned, the wrapper scrolls normally, so rect.top means something
      // completely different — show everything rather than compute nonsense.
      if (mq.matches) {
        setProgress(1)
        return
      }

      const rect = el.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      // While the wrapper is taller than the viewport its sticky child stays
      // pinned, and rect.top runs 0 (pin starts) → -scrollable (pin ends).
      setProgress(scrollable > 0 ? clamp01(-rect.top / scrollable) : 1)
    }

    function onScroll() {
      if (frame == null) frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    mq.addEventListener('change', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      mq.removeEventListener('change', onScroll)
      if (frame != null) cancelAnimationFrame(frame)
    }
  }, [still])

  return (
    <section
      ref={wrapperRef}
      className={still ? 'pinned-wrapper pinned-wrapper-static' : 'pinned-wrapper'}
      style={{ '--pin-length': pinLength }}
    >
      <div className={`pinned-stage ${className}`}>{children(progress)}</div>
    </section>
  )
}

/**
 * Maps a slice of the section's scroll into a fade-and-rise. Elements overlap
 * their windows deliberately, so the section reads as one movement rather than
 * a queue of separate animations.
 */
export function stage(progress, start, end, rise = 24) {
  const p = clamp01((progress - start) / (end - start))
  return { opacity: p, transform: `translateY(${(1 - p) * rise}px)` }
}
