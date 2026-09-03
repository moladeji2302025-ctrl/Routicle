import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

function clamp01(n) {
  return Math.min(1, Math.max(0, n))
}

export default function FooterCta() {
  const wrapperRef = useRef(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = null

    function measure() {
      frame = null
      const el = wrapperRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      // While the wrapper is taller than the viewport, its sticky child stays
      // pinned; rect.top runs from 0 (pin starts) to -scrollable (pin ends).
      setProgress(scrollable > 0 ? clamp01(-rect.top / scrollable) : 1)
    }

    function onScroll() {
      if (frame == null) frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame != null) cancelAnimationFrame(frame)
    }
  }, [])

  // The background image is static (always visible, like the hero's) —
  // only the text, then the buttons, stage in across the pinned scroll.
  const textP = clamp01(progress / 0.5)
  const buttonsP = clamp01((progress - 0.45) / 0.55)

  const riseStyle = (p) => ({ opacity: p, transform: `translateY(${(1 - p) * 18}px)` })

  return (
    <section className="footer-cta-pin-wrapper" ref={wrapperRef}>
      <div className="footer-cta">
        <div className="footer-cta-bg" aria-hidden="true">
          <img src="/images/footer-hillside.jpg" alt="" />
        </div>

        <div className="footer-cta-content">
          <span className="footer-cta-tag" style={riseStyle(textP)}>Ready when you are</span>
          <h2 className="footer-cta-title" style={riseStyle(textP)}>Where Unused Work Earns</h2>
          <div className="footer-cta-row" style={riseStyle(buttonsP)}>
            <Link to="/become-creator" className="hero-deck-btn-primary">
              Start earning <span aria-hidden="true">→</span>
            </Link>
            <Link to="/explore" className="hero-deck-btn-secondary">Browse the library</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
