import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const LEFT_LINKS = [
  { label: 'Explore', to: '/explore' },
  { label: 'Departments', to: '/explore' },
  { label: 'Pricing', to: '/pricing' },
]

export default function Navbar() {
  const [hidden, setHidden] = useState(false)
  const { currentUser } = useApp()

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

  const rightLinks = [
    { label: 'AI Studio', to: '/studio/image' },
    { label: 'Become a Creator', to: '/become-creator' },
  ]

  return (
    <div className={hidden ? 'navbar navbar-hidden' : 'navbar'}>
      <div className="navbar-row">
        <nav className="navbar-links navbar-links-left">
          {LEFT_LINKS.map((link) => (
            <Link key={link.label} to={link.to} className="link-muted">{link.label}</Link>
          ))}
        </nav>

        <Link to="/" className="logo">
          <img src="/brand/routicle-mark-black.svg" alt="" className="logo-icon" />
          Routicle
        </Link>

        <div className="navbar-right">
          <nav className="navbar-links navbar-links-right">
            {rightLinks.map((link) => (
              <Link key={link.label} to={link.to} className="link-muted">{link.label}</Link>
            ))}
          </nav>
          {currentUser ? (
            <Link to="/account" className="btn-solid">{currentUser.name.split(' ')[0]}</Link>
          ) : (
            <>
              <Link to="/signin" className="link-muted">Sign in</Link>
              <Link to="/signup" className="btn-solid">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
