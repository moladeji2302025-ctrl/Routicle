import { useEffect, useRef } from 'react'

const STATS = [
  { number: '5', label: 'DEPARTMENTS', image: '/images/t1.jpg', top: '0%' },
  { number: '500+', label: 'LAUNCH FILES', image: '/images/t5.jpg', top: '9%' },
  { number: '25', label: 'FOUNDING CREATORS', image: '/images/t9.jpg', top: '18%' },
  { number: '50%', label: 'CREATOR SHARE', image: '/images/t7.jpg', top: '9%' },
  { number: '2', label: 'AI STUDIOS', image: '/images/t2.jpg', top: '0%' },
  { number: '$50', label: 'MIN. PAYOUT', image: '/images/t4.jpg', top: '18%' },
  { number: '90', label: 'DAY ELIGIBILITY', image: '/images/t6.jpg', top: '9%' },
  { number: '$15', label: 'REFERRAL BONUS', image: '/images/t8.jpg', top: '0%' },
]

const EASE_POWER = 3

export default function Stats() {
  const wrapperRef = useRef(null)
  const tileRefs = useRef([])

  useEffect(() => {
    let ticking = false

    function update() {
      ticking = false
      const wrapper = wrapperRef.current
      if (!wrapper) return

      const rect = wrapper.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      const progress = scrollable > 0 ? Math.min(Math.max(-rect.top / scrollable, 0), 1) : 1

      const n = STATS.length
      tileRefs.current.forEach((el, i) => {
        if (!el) return
        const start = i / n
        const local = Math.min(Math.max((progress - start) * n, 0), 1)
        const eased = 1 - Math.pow(1 - local, EASE_POWER)
        const x = (1 - eased) * 90
        const y = (1 - eased) * 30
        el.style.transform = `translate(${x}px, ${y}px)`
        el.style.opacity = String(eased)
      })
    }

    function onScroll() {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
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

        <div className="stats-cascade">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              ref={(el) => (tileRefs.current[i] = el)}
              className="stats-tile"
              style={{ top: stat.top }}
            >
              <img src={stat.image} alt="" className="stats-tile-image" />
              <div className="stats-tile-text">
                <span className="stats-tile-number">{stat.number}</span>
                <span className="stats-tile-label">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
