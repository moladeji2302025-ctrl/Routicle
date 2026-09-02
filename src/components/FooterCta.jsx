import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

export default function FooterCta() {
  const wrapperRef = useRef(null)
  const titleRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    let ticking = false

    function update() {
      ticking = false
      const wrapper = wrapperRef.current
      if (!wrapper) return

      const rect = wrapper.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      const progress = scrollable > 0 ? Math.min(Math.max(-rect.top / scrollable, 0), 1) : 1

      const titleLocal = Math.min(Math.max(progress / 0.5, 0), 1)
      const buttonLocal = Math.min(Math.max((progress - 0.5) / 0.5, 0), 1)

      if (titleRef.current) {
        titleRef.current.style.opacity = String(titleLocal)
        titleRef.current.style.transform = `translateY(${(1 - titleLocal) * 26}px)`
      }
      if (buttonRef.current) {
        buttonRef.current.style.opacity = String(buttonLocal)
        buttonRef.current.style.transform = `translateY(${(1 - buttonLocal) * 26}px)`
      }
    }

    function onScroll() {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <section className="footer-cta-wrapper" ref={wrapperRef}>
      <div className="footer-cta">
        <img src="/images/hero-bg.jpg" alt="" className="footer-cta-image" />
        <div className="footer-cta-fade" />

        <div className="footer-cta-content">
          <h2 className="footer-cta-title" ref={titleRef}>Where Unused Work Earns</h2>
          <Link to="/become-creator" className="footer-cta-button" ref={buttonRef}>
            Start earning <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
