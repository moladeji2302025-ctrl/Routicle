import { useEffect, useState } from 'react'

const LEFT_LINKS = ['Explore', 'Departments', 'Pricing']
const RIGHT_LINKS = ['AI Studio', 'Become a Creator', 'FAQ']

export default function Navbar() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const target = document.querySelector('.site-footer')
    if (!target || typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return (
    <div className={hidden ? 'navbar navbar-hidden' : 'navbar'}>
      <div className="navbar-row">
        <nav className="navbar-links navbar-links-left">
          {LEFT_LINKS.map((link) => (
            <a key={link} href="#" className="link-muted">{link}</a>
          ))}
        </nav>

        <a href="#" className="logo">
          <img src="/brand/routicle-mark-black.svg" alt="" className="logo-icon" />
          Routicle
        </a>

        <div className="navbar-right">
          <nav className="navbar-links navbar-links-right">
            {RIGHT_LINKS.map((link) => (
              <a key={link} href="#" className="link-muted">{link}</a>
            ))}
          </nav>
          <a href="#" className="btn-solid">Sign up</a>
        </div>
      </div>
    </div>
  )
}
