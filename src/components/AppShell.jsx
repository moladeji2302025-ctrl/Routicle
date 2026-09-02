import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  HomeIcon,
  SearchIcon,
  SparkleIcon,
  FolderIcon,
  ChartIcon,
  UploadIcon,
  UserIcon,
  SunIcon,
  MoonIcon,
  LogOutIcon,
  PlusIcon,
} from './icons'

const NAV_ITEMS = [
  { label: 'Home', to: '/', icon: HomeIcon, match: (p) => p === '/' },
  { label: 'Explore', to: '/explore', icon: SearchIcon, match: (p) => p.startsWith('/explore') },
  { label: 'AI Studio', to: '/studio/image', icon: SparkleIcon, match: (p) => p.startsWith('/studio') },
  { label: 'Collections', to: '/collections', icon: FolderIcon, match: (p) => p.startsWith('/collections') },
]

export default function AppShell() {
  const { currentUser, theme, toggleTheme, signOut } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link to="/" className="app-logo">
          <img src="/brand/routicle-mark-black.svg" alt="" className="app-logo-icon" />
          Routicle
        </Link>

        <button type="button" className="app-create-btn" onClick={() => navigate('/studio/image')}>
          <PlusIcon size={16} color="currentColor" />
          Create
        </button>

        <nav className="app-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = item.match(location.pathname)
            return (
              <Link key={item.label} to={item.to} className={active ? 'app-nav-item app-nav-item-active' : 'app-nav-item'}>
                <Icon size={17} color="currentColor" />
                {item.label}
              </Link>
            )
          })}

          {currentUser?.isCreator ? (
            <Link
              to="/dashboard"
              className={location.pathname.startsWith('/dashboard') ? 'app-nav-item app-nav-item-active' : 'app-nav-item'}
            >
              <ChartIcon size={17} color="currentColor" />
              Dashboard
            </Link>
          ) : (
            <Link
              to="/become-creator"
              className={location.pathname.startsWith('/become-creator') ? 'app-nav-item app-nav-item-active' : 'app-nav-item'}
            >
              <UploadIcon size={17} color="currentColor" />
              Become a Creator
            </Link>
          )}

          {currentUser?.isAdmin && (
            <Link to="/admin" className={location.pathname.startsWith('/admin') ? 'app-nav-item app-nav-item-active' : 'app-nav-item'}>
              <FolderIcon size={17} color="currentColor" />
              Moderation
            </Link>
          )}
        </nav>

        <div className="app-sidebar-bottom">
          <button type="button" className="app-icon-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <SunIcon size={16} color="currentColor" /> : <MoonIcon size={16} color="currentColor" />}
          </button>
          <button type="button" className="app-icon-btn" onClick={handleSignOut} title="Sign out">
            <LogOutIcon size={16} color="currentColor" />
          </button>
          <Link to="/account" className="app-avatar-link" title={currentUser?.name}>
            {currentUser?.image ? (
              <img src={currentUser.image} alt="" className="app-avatar-img" />
            ) : (
              <span className="app-avatar-fallback">
                <UserIcon size={15} color="currentColor" />
              </span>
            )}
          </Link>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
