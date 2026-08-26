import { useEffect, useRef } from 'react'

const STATS = [
  { number: '5', label: 'DEPARTMENTS', image: '/images/t1.jpg' },
  { number: '500+', label: 'LAUNCH FILES', image: '/images/t5.jpg' },
  { number: '25', label: 'FOUNDING CREATORS', image: '/images/t9.jpg' },
  { number: '50%', label: 'CREATOR SHARE', image: '/images/t7.jpg' },
  { number: '2', label: 'AI STUDIOS', image: '/images/t2.jpg' },
  { number: '$50', label: 'MIN. PAYOUT', image: '/images/t4.jpg' },
  { number: '90', label: 'DAY ELIGIBILITY', image: '/images/t6.jpg' },
  { number: '$15', label: 'REFERRAL BONUS', image: '/images/t8.jpg' },
]

const MAX_SCALE = 1.16
const MIN_SCALE = 0.8
const MIN_OPACITY = 0.32
const MIN_BRIGHTNESS = 0.45

export default function Stats() {
  const wrapperRef = useRef(null)
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const tileRefs = useRef([])
  const startSpacerRef = useRef(null)
  const endSpacerRef = useRef(null)

  useEffect(() => {
    let ticking = false
    let maxDistance = 0
    let falloff = 400

    function measure() {
      const viewport = viewportRef.current
      const track = trackRef.current
      const firstTile = tileRefs.current[0]
      const startSpacer = startSpacerRef.current
      const endSpacer = endSpacerRef.current
      if (!viewport || !track || !firstTile || !startSpacer || !endSpacer) return

      const tileWidth = firstTile.getBoundingClientRect().width
      falloff = tileWidth * 1.5

      // Reset spacers before measuring so scrollWidth reflects only the tiles.
      startSpacer.style.width = '0px'
      endSpacer.style.width = '0px'
      const spacerWidth = Math.max(viewport.clientWidth / 2 - tileWidth / 2, 0)
      startSpacer.style.width = `${spacerWidth}px`
      endSpacer.style.width = `${spacerWidth}px`

      maxDistance = Math.max(track.scrollWidth - viewport.clientWidth, 0)
    }

    function update() {
      ticking = false
      const wrapper = wrapperRef.current
      const track = trackRef.current
      const viewport = viewportRef.current
      if (!wrapper || !track || !viewport) return

      const rect = wrapper.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      const progress = scrollable > 0 ? Math.min(Math.max(-rect.top / scrollable, 0), 1) : 1

      track.style.transform = `translateX(${-progress * maxDistance}px)`

      const viewportRect = viewport.getBoundingClientRect()
      const viewportCenter = viewportRect.left + viewportRect.width / 2

      tileRefs.current.forEach((el) => {
        if (!el) return
        const tileRect = el.getBoundingClientRect()
        const tileCenter = tileRect.left + tileRect.width / 2
        const norm = Math.min(Math.abs(tileCenter - viewportCenter) / falloff, 1)

        const scale = MAX_SCALE - norm * (MAX_SCALE - MIN_SCALE)
        const opacity = 1 - norm * (1 - MIN_OPACITY)
        const brightness = 1 - norm * (1 - MIN_BRIGHTNESS)

        el.style.transform = `scale(${scale})`
        el.style.opacity = String(opacity)
        el.style.filter = `brightness(${brightness})`
      })
    }

    function onScroll() {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    function onResize() {
      measure()
      update()
    }

    measure()
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <section className="stats-wrapper" ref={wrapperRef}>
      <div className="stats-sticky">
        <div className="stats-glow" />

        <div className="stats-intro">
          <span className="stats-eyebrow">What we've built</span>
          <h2 className="stats-title">Growing, one upload at a time</h2>
        </div>

        <div className="stats-cascade" ref={viewportRef}>
          <div className="stats-track" ref={trackRef}>
            <div ref={startSpacerRef} className="stats-spacer" aria-hidden="true" />
            {STATS.map((stat, i) => (
              <div key={stat.label} ref={(el) => (tileRefs.current[i] = el)} className="stats-tile">
                <img src={stat.image} alt="" className="stats-tile-image" />
                <div className="stats-tile-text">
                  <span className="stats-tile-number">{stat.number}</span>
                  <span className="stats-tile-label">{stat.label}</span>
                </div>
              </div>
            ))}
            <div ref={endSpacerRef} className="stats-spacer" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  )
}
