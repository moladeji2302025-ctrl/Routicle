import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { SunIcon, MoonIcon, SearchIcon } from './icons'

const NAV_LINKS = [
  { label: 'Explore', to: '/explore' },
  { label: 'Departments', to: '/explore' },
  { label: 'AI Studio', to: '/studio/image' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Become a Creator', to: '/become-creator' },
]

export default function Navbar() {
  const [hidden, setHidden] = useState(false)
  const [query, setQuery] = useState('')
  const { currentUser, theme, toggleTheme } = useApp()
  const navigate = useNavigate()

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

  const handleSearch = (e) => {
    e.preventDefault()
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
          <button type="button" className="navbar-theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <SunIcon size={15} color="currentColor" /> : <MoonIcon size={15} color="currentColor" />}
          </button>
          {currentUser ? (
            <Link to="/account" className="btn-solid">{currentUser.name.split(' ')[0]}</Link>
          ) : (
            <>
              <Link to="/signin" className="link-muted">Log in</Link>
              <Link to="/signup" className="btn-solid">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
