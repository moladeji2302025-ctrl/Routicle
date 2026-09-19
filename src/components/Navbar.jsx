import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { SearchIcon } from './icons'

const NAV_LINKS = [
  { label: 'Explore', to: '/explore' },
  { label: 'Categories', to: '/categories' },
  { label: 'Creative Suite', to: '/suite/creative' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Become a Creator', to: '/become-creator' },
]

export default function Navbar() {
  const [hidden, setHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { currentUser } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

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

  // Following a link should close the menu, and it shouldn't survive a back
  // button either.
  useEffect(() => setMenuOpen(false), [location.pathname])

  // A fixed sheet over the page shouldn't leave the page scrolling underneath.
  useEffect(() => {
    if (!menuOpen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const handleSearch = (e) => {
    e.preventDefault()
    setMenuOpen(false)
    navigate(query.trim() ? `/explore?q=${encodeURIComponent(query.trim())}` : '/explore')
  }

  return (
    <div className={hidden ? 'navbar navbar-hidden' : 'navbar'}>
      <div className="navbar-row">
        <Link to="/" className="logo">
          <img src="/brand/routicle-mark-black.svg" alt="" className="logo-icon" />
          Routicle
        </Link>

        <nav className="navbar-links">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} to={link.to} className="link-muted">{link.label}</Link>
          ))}
        </nav>

        <div className="navbar-right">
          <form className="navbar-search" onSubmit={handleSearch}>
            <SearchIcon size={14} color="currentColor" />
            <input
              type="text"
              placeholder="Search or create"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
          {currentUser ? (
            <Link to="/account" className="btn-solid navbar-account">{currentUser.name.split(' ')[0]}</Link>
          ) : (
            <>
              <Link to="/signin" className="link-muted navbar-login">Log in</Link>
              <Link to="/signup" className="btn-solid navbar-signup">Sign up</Link>
            </>
          )}
        </div>

        {/* Only shown below the desktop breakpoint; the links and search above
            are hidden there instead. */}
        <button
          type="button"
          className="navbar-burger"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className={menuOpen ? 'navbar-burger-bars navbar-burger-x' : 'navbar-burger-bars'}>
            <i />
            <i />
            <i />
          </span>
        </button>
      </div>

      {menuOpen && (
        <>
          <button type="button" className="navbar-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="navbar-sheet" role="dialog" aria-label="Menu">
            <form className="navbar-sheet-search" onSubmit={handleSearch}>
              <SearchIcon size={15} color="currentColor" />
              <input
                type="search"
                placeholder="Search the library"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </form>

            <nav className="navbar-sheet-links">
              {NAV_LINKS.map((link) => (
                <Link key={link.label} to={link.to}>
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="navbar-sheet-actions">
              {currentUser ? (
                <Link to="/account" className="btn-solid">
                  Your account
                </Link>
              ) : (
                <>
                  <Link to="/signin" className="navbar-sheet-login">
                    Log in
                  </Link>
                  <Link to="/signup" className="btn-solid">
                    Sign up free
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
