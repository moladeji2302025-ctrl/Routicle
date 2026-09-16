import { NavLink, Outlet, Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { ImageIcon, VideoIcon, FolderIcon, PenIcon, SparkleIcon } from '../../components/icons'

/**
 * The AI Suite: the two studios and the two suites under one roof.
 *
 * Business and Creative are aimed at different jobs — running the client
 * relationship versus producing the asset — so they sit as peers rather than
 * one being buried inside the other.
 */
const TOOLS = [
  { to: '/suite/business', label: 'Business Suite', icon: FolderIcon, blurb: 'Client projects, forms and documents' },
  { to: '/suite/creative', label: 'Creative Suite', icon: PenIcon, blurb: 'Logo and brand asset generation' },
  { to: '/studio/image', label: 'AI Image', icon: ImageIcon, blurb: 'Generate and upscale stills' },
  { to: '/studio/video', label: 'AI Video', icon: VideoIcon, blurb: 'Generate short clips' },
]

export default function SuiteLayout() {
  const { currentUser } = useApp()

  if (!currentUser) {
    return (
      <div className="dashboard-page dashboard-gate">
        <h1>Sign in to use the AI Suite</h1>
        <Link to="/signin" className="btn-hero-primary">Sign in</Link>
      </div>
    )
  }

  return (
    <div className="suite-shell">
      <header className="suite-head">
        <h1>
          <SparkleIcon size={20} color="var(--brand-violet)" />
          AI Suite
        </h1>
        <p>Two tools for two different jobs: managing your clients and making the work.</p>
      </header>

      <nav className="suite-tabs">
        {TOOLS.map((t) => {
          const Icon = t.icon
          return (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => (isActive ? 'suite-tab suite-tab-active' : 'suite-tab')}
            >
              <Icon size={15} color="currentColor" />
              <span>
                <strong>{t.label}</strong>
                <em>{t.blurb}</em>
              </span>
            </NavLink>
          )
        })}
      </nav>

      <div className="suite-body">
        <Outlet />
      </div>
    </div>
  )
}
