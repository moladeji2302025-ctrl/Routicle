import { useEffect, useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import MaintenanceBanner from './MaintenanceBanner'
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
  UserIcon,
  SettingsIcon,
  GridIcon,
  BookmarkIcon,
  MenuIcon,
  CardIcon,
  HelpIcon,
  PenIcon,
  ShieldIcon,
  BellIcon,
  BriefcaseIcon,
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
      { label: 'Categories', to: '/categories', icon: GridIcon },
      { label: 'Following', to: '/following', icon: UsersIcon },
      { label: 'People', to: '/people', icon: UserIcon },
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
      { label: 'Creative Suite', to: '/suite/creative', icon: SparkleIcon },
      { label: 'Business Suite', to: '/suite/business', icon: BriefcaseIcon },
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

/**
 * The bottom bar's destinations on a phone, where a 19-item sidebar cannot
 * live on screen. Everything else is one tap away in the drawer.
 */
const MOBILE_TABS = [
  { label: 'Home', to: '/', icon: HomeIcon, match: (p) => p === '/' },
  { label: 'Explore', to: '/explore', icon: SearchIcon },
  { label: 'Create', to: '/suite/creative', icon: PlusIcon, accent: true },
  { label: 'Saved', to: '/collections', icon: BookmarkIcon },
]

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

  // Open/closed state of the mobile drawer. Separate from `collapsed`, which is
  // the desktop rail: on a phone the sidebar is off-canvas either way, so
  // reusing one flag would mean a desktop preference decided whether the
  // drawer started open.
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Any navigation closes the drawer, including the back button.
  useEffect(() => setDrawerOpen(false), [location.pathname])

  useEffect(() => {
    if (!drawerOpen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e) {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [drawerOpen])

  /**
   * One button, two jobs, decided by which layout is on screen: below the
   * breakpoint it opens the drawer, above it collapses the rail. Checked at
   * click time rather than held in state, so a rotation or resize can't leave
   * it wired to the wrong one.
   */
  function handleSidebarButton() {
    const phone = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
    if (phone) setDrawerOpen((v) => !v)
    else toggleSidebar()
  }

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
    <div
      className={[
        'app-shell',
        collapsed && 'app-shell-collapsed',
        drawerOpen && 'app-shell-drawer-open',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* In-app only: the signed-out marketing pages keep the system cursor. */}
      <AppCursor />

      {/* Only hit-testable while the drawer is open (CSS), so it never sits over
          the desktop layout. */}
      <button
        type="button"
        className="app-scrim"
        aria-label="Close menu"
        tabIndex={drawerOpen ? 0 : -1}
        onClick={() => setDrawerOpen(false)}
      />

      <aside className="app-sidebar">
        <Link to="/" className="app-logo" title="Routicle">
          <img src="/brand/routicle-mark-black.svg" alt="" className="app-logo-icon" />
          <span className="app-rail-label">Routicle</span>
        </Link>

        <button
          type="button"
          className="app-create-btn"
          onClick={() => navigate('/suite/creative')}
          title="Create"
        >
          <PlusIcon size={16} color="currentColor" />
          <span className="app-rail-label">Create</span>
        </button>

        {renderGroups(NAV_GROUPS.filter((g) => !g.foot), 'app-nav')}
        {renderGroups(NAV_GROUPS.filter((g) => g.foot), 'app-nav app-nav-foot')}

      </aside>

      <div className="app-main-col">
        <MaintenanceBanner />
        <AppTopBar collapsed={collapsed} onToggleSidebar={handleSidebarButton} />
        <main className="app-main">
          <Outlet />
        </main>

        {/* Phone-only tab bar. Hidden above the breakpoint by CSS rather than
            unmounted, so switching layouts never remounts the page. */}
        <nav className="app-tabbar" aria-label="Primary">
          {MOBILE_TABS.map((tab) => {
            const Icon = tab.icon
            const on = tab.match ? tab.match(location.pathname) : location.pathname.startsWith(tab.to)
            return (
              <Link
                key={tab.label}
                to={tab.to}
                className={[
                  'app-tab',
                  on && 'app-tab-on',
                  tab.accent && 'app-tab-accent',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <Icon size={20} color="currentColor" />
                <span>{tab.label}</span>
              </Link>
            )
          })}
          <button type="button" className="app-tab" onClick={() => setDrawerOpen(true)}>
            <MenuIcon size={20} color="currentColor" />
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
