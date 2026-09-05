import { NavLink, Outlet, Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import {
  ChartIcon,
  SparkleIcon,
  FolderIcon,
  UsersIcon,
  HelpIcon,
  GridIcon,
} from '../../components/icons'

const ADMIN_NAV = [
  { to: '/admin', end: true, label: 'Overview', icon: ChartIcon },
  { to: '/admin/updates', label: "What's new", icon: SparkleIcon },
  { to: '/admin/content', label: 'Library', icon: FolderIcon },
  { to: '/admin/moderation', label: 'Moderation', icon: GridIcon },
  { to: '/admin/resources', label: 'Resources', icon: HelpIcon },
  { to: '/admin/users', label: 'People', icon: UsersIcon },
]

/**
 * The admin console. Gated on `isPlatformAdmin`, which comes from the server
 * (/api/admin/session) rather than the local prototype flag — and every route
 * behind it re-checks the session cookie anyway, so hiding the UI is a
 * convenience, not the security boundary.
 */
export default function AdminLayout() {
  const { currentUser, isPlatformAdmin, adminReason } = useApp()

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
          This account isn't a platform admin. Ask an existing admin to grant access, or add your
          email to <code>ADMIN_EMAILS</code> if you're setting the first one up.
        </p>
        {adminReason && <p className="settings-error">{adminReason}</p>}
        <Link to="/" className="btn-hero-primary">Back to Routicle</Link>
      </div>
    )
  }

  return (
    <div className="admin-console">
      <header className="admin-console-head">
        <div>
          <h1>Admin</h1>
          <p>Signed in as {currentUser.email} — changes here affect everyone.</p>
        </div>
      </header>

      <nav className="admin-tabs">
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'admin-tab admin-tab-active' : 'admin-tab')}
            >
              <Icon size={14} color="currentColor" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="admin-console-body">
        <Outlet />
      </div>
    </div>
  )
}
