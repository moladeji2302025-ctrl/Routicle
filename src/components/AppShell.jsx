import { useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AppTopBar from './AppTopBar'
import AppCursor from './AppCursor'
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
  BookmarkIcon,
  CardIcon,
  HelpIcon,
  PenIcon,
  ShieldIcon,
  BellIcon,
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
      { label: 'Collections', to: '/collections', icon: BookmarkIcon },
      { label: 'Downloads', to: '/downloads', icon: FolderIcon },
    ],
  },
  {
    label: 'Create',
    items: [
      { label: 'AI Suite', to: '/suite', icon: SparkleIcon },
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
    ],
  },
  {
    label: 'More',
    // Utility destinations, pinned to the bottom of the rail rather than left
    // to trail off the end of a long nav.
    foot: true,
    items: [
      { label: "What's new", to: '/updates', icon: BellIcon },
      { label: 'Resources', to: '/resources', icon: HelpIcon },
      { label: 'Pricing', to: '/pricing', icon: CardIcon },
      { label: 'Settings', to: '/settings', icon: SettingsIcon },
    ],
  },
  {
    label: 'Platform',
    foot: true,
    // Gated on the server's answer, not the local prototype flag — and the
    // console re-checks the session on every request behind it anyway.
    when: (ctx) => ctx.isPlatformAdmin,
    items: [{ label: 'Admin console', to: '/admin', icon: ShieldIcon }],
  },
]

const COLLAPSE_KEY = 'routicle_sidebar_collapsed'

export default function AppShell() {
  const { currentUser, isPlatformAdmin } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  // Remembered per browser: someone who works collapsed should not have to
  // collapse it again on every visit.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })

  function toggleSidebar() {
    setCollapsed((v) => {
      const next = !v
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        // storage blocked — the choice just won't persist
      }
      return next
    })
  }
  const navContext = { ...currentUser, isPlatformAdmin }

  // Default match is prefix-based, so /design/12 doesn't light up Explore but
  // /settings/plan does light up Settings.
  function isActive(item) {
    if (item.match) return item.match(location.pathname)
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
  }

  function renderGroups(groups, className) {
    const rendered = groups
      .filter((group) => !group.when || group.when(navContext))
      .map((group) => ({ group, items: group.items.filter((item) => !item.when || item.when(navContext)) }))
      .filter(({ items }) => items.length > 0)

    if (rendered.length === 0) return null

    return (
      <nav className={className}>
        {rendered.map(({ group, items }) => (
          <div key={group.label} className="app-nav-group">
            <p className="app-nav-label"><span>{group.label}</span></p>
            {items.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={isActive(item) ? 'app-nav-item app-nav-item-active' : 'app-nav-item'}
                  title={item.label}
                >
                  <Icon size={16} color="currentColor" />
                  <span className="app-rail-label">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    )
  }

  return (
    <div className={collapsed ? 'app-shell app-shell-collapsed' : 'app-shell'}>
      {/* In-app only: the signed-out marketing pages keep the system cursor. */}
      <AppCursor />

      <aside className="app-sidebar">
        <Link to="/" className="app-logo" title="Routicle">
          <img src="/brand/routicle-mark-black.svg" alt="" className="app-logo-icon" />
          <span className="app-rail-label">Routicle</span>
        </Link>

        <button
          type="button"
          className="app-create-btn"
          onClick={() => navigate('/studio/image')}
          title="Create"
        >
          <PlusIcon size={16} color="currentColor" />
          <span className="app-rail-label">Create</span>
        </button>

        {renderGroups(NAV_GROUPS.filter((g) => !g.foot), 'app-nav')}
        {renderGroups(NAV_GROUPS.filter((g) => g.foot), 'app-nav app-nav-foot')}

      </aside>

      <div className="app-main-col">
        <AppTopBar collapsed={collapsed} onToggleSidebar={toggleSidebar} />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
