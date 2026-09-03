import { Link } from 'react-router-dom'
import { SearchIcon } from './icons'

const LINKS = [
  { label: 'Explore', to: '/explore' },
  { label: 'Departments', to: '/explore' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'AI Studio', to: '/studio/image' },
  { label: 'Become a Creator', to: '/become-creator' },
]

export default function CinematicNav() {
  return (
    <nav className="cinematic-nav">
      <Link to="/" className="cinematic-nav-logo">
        <img src="/brand/routicle-mark-white.svg" alt="" className="cinematic-nav-logo-icon" />
        Routicle
      </Link>

      <button type="button" className="cinematic-nav-search" aria-label="Search">
        <SearchIcon size={15} color="currentColor" />
      </button>

      <div className="cinematic-nav-links">
        {LINKS.map((link) => (
          <Link key={link.label} to={link.to} className="cinematic-nav-link">
            {link.label}
          </Link>
        ))}
      </div>

      <div className="cinematic-nav-auth">
        <Link to="/signin" className="cinematic-nav-signin">Log in</Link>
        <Link to="/signup" className="cinematic-nav-signup">Sign up</Link>
      </div>
    </nav>
  )
}
