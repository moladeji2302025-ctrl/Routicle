import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AccountMenu from './AccountMenu'
import {
  HomeIcon,
  SearchIcon,
  SparkleIcon,
  FolderIcon,
  ChartIcon,
  UploadIcon,
  PlusIcon,
  UsersIcon,
  SettingsIcon,
  GridIcon,
  ImageIcon,
  VideoIcon,
  HeartIcon,
  CardIcon,
  HelpIcon,
  PenIcon,
} from './icons'

/**
 * Sidebar navigation, grouped by what you're trying to do rather than as one
 * flat list. `when` hides sections that don't apply to the account — an Upload
 * link that bounces a non-creator to an application form is worse than no link.
 */
const NAV_GROUPS = [
  {
    label: 'Browse',
    items: [
      { label: 'Home', to: '/', icon: HomeIcon, match: (p) => p === '/' },
      { label: 'Explore', to: '/explore', icon: SearchIcon },
      { label: 'Departments', to: '/departments', icon: GridIcon },
      { label: 'Following', to: '/following', icon: UsersIcon },
    ],
  },
  {
    label: 'Library',
    items: [
      { label: 'Collections', to: '/collections', icon: HeartIcon },
      { label: 'Downloads', to: '/downloads', icon: FolderIcon },
    ],
  },
  {
    label: 'Create',
    items: [
      { label: 'AI Image', to: '/studio/image', icon: ImageIcon },
      { label: 'AI Video', to: '/studio/video', icon: VideoIcon },
      { label: 'Upload', to: '/upload', icon: UploadIcon, when: (u) => u?.isCreator },
      { label: 'Projects', to: '/projects', icon: PenIcon, when: (u) => u?.isCreator },
      { label: 'Become a Creator', to: '/become-creator', icon: UploadIcon, when: (u) => !u?.isCreator },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Workspaces', to: '/workspaces', icon: UsersIcon },
      { label: 'Team', to: '/team', icon: UsersIcon },
      { label: 'Earnings', to: '/dashboard', icon: ChartIcon, when: (u) => u?.isCreator },
      { label: 'Moderation', to: '/admin', icon: SparkleIcon, when: (u) => u?.isAdmin },
    ],
  },
  {
    label: 'More',
    items: [
      { label: 'Resources', to: '/resources', icon: HelpIcon },
      { label: 'Pricing', to: '/pricing', icon: CardIcon },
      { label: 'Settings', to: '/settings', icon: SettingsIcon },
    ],
  },
]

export default function AppShell() {
  const { currentUser } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  // Default match is prefix-based, so /design/12 doesn't light up Explore but
  // /settings/plan does light up Settings.
  function isActive(item) {
    if (item.match) return item.match(location.pathname)
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
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
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((item) => !item.when || item.when(currentUser))
            if (items.length === 0) return null
            return (
              <div key={group.label} className="app-nav-group">
                <p className="app-nav-label">{group.label}</p>
                {items.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      className={isActive(item) ? 'app-nav-item app-nav-item-active' : 'app-nav-item'}
                    >
                      <Icon size={16} color="currentColor" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <div className="app-sidebar-bottom">
          <AccountMenu />
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
