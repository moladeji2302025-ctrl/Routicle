import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  UserIcon,
  SettingsIcon,
  CardIcon,
  UsersIcon,
  SparkleIcon,
  SearchIcon,
  FolderIcon,
  ChartIcon,
  HelpIcon,
  GridIcon,
} from '../components/icons'

/**
 * The settings sections, grouped by which part of the product they govern.
 * `when` hides sections that don't apply to this account rather than showing
 * them disabled — an empty Creator tab on a non-creator account is noise.
 */
export const SETTINGS_GROUPS = [
  {
    label: 'Account',
    items: [
      { to: 'profile', label: 'Profile', icon: UserIcon, keywords: 'name avatar bio links social' },
      { to: 'security', label: 'Sign-in & security', icon: SettingsIcon, keywords: 'password sessions devices email delete' },
      { to: 'notifications', label: 'Notifications', icon: HelpIcon, keywords: 'email alerts digest updates' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { to: 'plan', label: 'Plan & billing', icon: CardIcon, keywords: 'subscription tier invoice cancel upgrade payments' },
      { to: 'workspace', label: 'Teams & workspaces', icon: UsersIcon, keywords: 'team members invite shared collections' },
    ],
  },
  {
    label: 'App',
    items: [
      { to: 'appearance', label: 'Appearance', icon: GridIcon, keywords: 'theme dark light density motion animation' },
      { to: 'browsing', label: 'Browsing & content', icon: SearchIcon, keywords: 'feed explore sort departments ai filter landing' },
      { to: 'studio', label: 'AI Studio', icon: SparkleIcon, keywords: 'credits image video generation history' },
    ],
  },
  {
    label: 'Creator',
    when: (u) => !!u?.isCreator,
    items: [{ to: 'creator', label: 'Creator & payouts', icon: ChartIcon, keywords: 'payout referral earnings upload' }],
  },
  {
    label: 'Data',
    items: [
      { to: 'privacy', label: 'Privacy & data', icon: FolderIcon, keywords: 'history export download visibility gdpr' },
      { to: 'developer', label: 'Developer', icon: SettingsIcon, keywords: 'role admin reset prototype demo' },
    ],
  },
]

export default function SettingsPage() {
  const { currentUser } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (!currentUser) navigate('/signin', { replace: true })
  }, [currentUser, navigate])

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return SETTINGS_GROUPS.filter((g) => !g.when || g.when(currentUser))
      .map((g) => ({
        ...g,
        items: q
          ? g.items.filter((i) => `${i.label} ${i.keywords}`.toLowerCase().includes(q))
          : g.items,
      }))
      .filter((g) => g.items.length > 0)
  }, [filter, currentUser])

  if (!currentUser) return null

  const active = location.pathname.split('/')[2] || 'profile'

  return (
    <div className="settings-page">
      <header className="settings-head">
        <h1>Settings</h1>
        <p>Everything about your account, workspace and how Routicle behaves for you.</p>
      </header>

      <div className="settings-body">
        <aside className="settings-nav">
          <div className="settings-nav-search">
            <SearchIcon size={13} color="currentColor" />
            <input
              type="search"
              value={filter}
              placeholder="Find a setting…"
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          {groups.map((group) => (
            <div key={group.label} className="settings-nav-group">
              <p className="settings-nav-label">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      isActive ? 'settings-nav-item settings-nav-item-active' : 'settings-nav-item'
                    }
                  >
                    <Icon size={15} color="currentColor" />
                    {item.label}
                  </NavLink>
                )
              })}
            </div>
          ))}

          {groups.length === 0 && <p className="settings-nav-empty">No settings match “{filter}”.</p>}
        </aside>

        <div className="settings-content" key={active}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
