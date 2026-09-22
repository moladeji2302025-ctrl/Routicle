import { NavLink, Outlet, Link, Navigate, useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import {
  ChartIcon,
  SparkleIcon,
  FolderIcon,
  UsersIcon,
  HelpIcon,
  GridIcon,
  BellIcon,
  ShieldIcon,
  LockIcon,
  SettingsIcon,
  PenIcon,
  BriefcaseIcon,
} from '../../components/icons'

export const ROLE_LABEL = {
  admin: 'Admin',
  marketing: 'Marketing',
  sales: 'Sales',
  support: 'Customer care',
  moderator: 'Moderation',
}

const ALL = ['admin', 'marketing', 'sales', 'support', 'moderator']

/**
 * Every console page, grouped, with the roles that may open it. A full admin
 * sees everything; the rest see only their own department. The server checks
 * the same roles on every request, so this only decides what is worth showing.
 */
const GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/admin', end: true, label: 'Dashboard', icon: ChartIcon, roles: ALL }],
  },
  {
    label: 'Library',
    items: [
      { to: '/admin/content', label: 'Library', icon: FolderIcon, roles: ['admin', 'moderator'] },
      { to: '/admin/moderation', label: 'Moderation', icon: GridIcon, roles: ['admin', 'moderator'] },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { to: '/admin/updates', label: "What's new", icon: SparkleIcon, roles: ['admin', 'marketing'] },
      { to: '/admin/resources', label: 'Resources', icon: HelpIcon, roles: ['admin', 'marketing'] },
      { to: '/admin/blog', label: 'Blog', icon: PenIcon, roles: ['admin', 'marketing'] },
      { to: '/admin/email', label: 'Email', icon: BellIcon, roles: ['admin', 'marketing'] },
    ],
  },
  {
    label: 'Customer care',
    items: [{ to: '/admin/support', label: 'Inbox', icon: BellIcon, roles: ['admin', 'support'] }],
  },
  {
    label: 'Sales',
    items: [{ to: '/admin/leads', label: 'Leads', icon: BriefcaseIcon, roles: ['admin', 'sales'] }],
  },
  {
    label: 'People',
    items: [{ to: '/admin/users', label: 'People', icon: UsersIcon, roles: ['admin', 'sales', 'support'] }],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/settings', label: 'Site settings', icon: SettingsIcon, roles: ['admin'] },
      { to: '/admin/activity', label: 'Activity', icon: LockIcon, roles: ['admin'] },
    ],
  },
]

export const ADMIN_PAGES = GROUPS.flatMap((g) => g.items)

/** Where someone lands when they open a page their role can't use. */
function homeFor(role) {
  return ADMIN_PAGES.find((p) => p.roles.includes(role))?.to || '/admin'
}

export default function AdminLayout() {
  const { currentUser, isPlatformAdmin, adminRole, adminReason } = useApp()
  const location = useLocation()

  if (!currentUser) {
    return (
      <div className="dashboard-page dashboard-gate">
        <h1>Sign in to continue</h1>
        <Link to="/signin" className="btn-hero-primary">Sign in</Link>
      </div>
    )
  }

  if (!isPlatformAdmin) {
    return (
      <div className="dashboard-page dashboard-gate">
        <h1>Admin access required</h1>
        <p>
          This account isn't on the Routicle team. Ask an admin to add you, or add your email to{' '}
          <code>ADMIN_EMAILS</code> if you're setting up the first one.
        </p>
        {adminReason && <p className="settings-error">{adminReason}</p>}
        <Link to="/" className="btn-hero-primary">Back to Routicle</Link>
      </div>
    )
  }

  // A role that lands on a page it can't use is moved to one it can, rather
  // than shown a wall of 403s.
  const here = ADMIN_PAGES.find((p) =>
    p.end ? location.pathname === p.to : location.pathname === p.to || location.pathname.startsWith(`${p.to}/`)
  )
  if (here && !here.roles.includes(adminRole)) return <Navigate to={homeFor(adminRole)} replace />

  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(adminRole)) })).filter(
    (g) => g.items.length > 0
  )

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand">
          <span className="adm-brand-mark"><ShieldIcon size={16} color="currentColor" /></span>
          <div>
            <strong>Console</strong>
            <span className="adm-role">{ROLE_LABEL[adminRole] || 'Staff'}</span>
          </div>
        </div>

        <nav className="adm-nav" aria-label="Admin sections">
          {groups.map((g) => (
            <div key={g.label} className="adm-group">
              <span className="adm-group-label">{g.label}</span>
              {g.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => (isActive ? 'adm-link adm-link-on' : 'adm-link')}
                  >
                    <Icon size={15} color="currentColor" />
                    {item.label}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="adm-who">
          <span>Signed in as</span>
          <strong>{currentUser.email}</strong>
        </div>
      </aside>

      <main className="adm-main">
        <Outlet />
      </main>
    </div>
  )
}
