import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { THEME_MODES } from '../data/settings'
import {
  UserIcon,
  CardIcon,
  SettingsIcon,
  FolderIcon,
  SunIcon,
  MoonIcon,
  HelpIcon,
  LogOutIcon,
  UsersIcon,
} from './icons'

const ROLE_LABEL = { free: 'Free', standard: 'Standard', express: 'Express' }

export default function AccountMenu() {
  const { currentUser, teams, activeTeam, activeTeamId, theme, settings, updateSettings, setActiveTeam, signOut } =
    useApp()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return undefined
    function onClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!currentUser) return null

  function go(to) {
    setOpen(false)
    navigate(to)
  }

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className="app-avatar-link"
        title={currentUser.name}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {currentUser.image ? (
          <img src={currentUser.image} alt="" className="app-avatar-img" />
        ) : (
          <span className="app-avatar-fallback">
            <UserIcon size={15} color="currentColor" />
          </span>
        )}
      </button>

      {open && (
        <div className="account-menu-panel">
          <div className="account-menu-header">
            {currentUser.image ? (
              <img src={currentUser.image} alt="" className="account-menu-avatar" />
            ) : (
              <span className="account-menu-avatar account-menu-avatar-fallback">
                <UserIcon size={17} color="currentColor" />
              </span>
            )}
            <div>
              <p className="account-menu-name">{currentUser.name}</p>
              <p className="account-menu-email">{currentUser.email}</p>
            </div>
          </div>

          <button type="button" className="account-menu-cta" onClick={() => go('/pricing')}>
            Get a plan
          </button>

          <div className="account-menu-divider" />

          <p className="account-menu-label">Workspace</p>
          <button
            type="button"
            className={!activeTeamId ? 'account-menu-item account-menu-item-selected' : 'account-menu-item'}
            onClick={() => setActiveTeam(null)}
          >
            <UserIcon size={16} color="currentColor" />
            Personal
          </button>
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              className={activeTeamId === team.id ? 'account-menu-item account-menu-item-selected' : 'account-menu-item'}
              onClick={() => setActiveTeam(team.id)}
            >
              <UsersIcon size={16} color="currentColor" />
              {team.name}
            </button>
          ))}
          <button type="button" className="account-menu-item account-menu-item-muted" onClick={() => go('/team')}>
            <UsersIcon size={16} color="currentColor" />
            {teams.length > 0 ? 'Manage teams' : 'Create a team'}
          </button>

          <div className="account-menu-divider" />

          <button type="button" className="account-menu-item" onClick={() => go('/settings/plan')}>
            <CardIcon size={16} color="currentColor" />
            Plan &amp; billing
            <span className="account-menu-badge">{ROLE_LABEL[activeTeam?.tier || currentUser.role] ?? 'Free'}</span>
          </button>
          <button type="button" className="account-menu-item" onClick={() => go('/settings')}>
            <SettingsIcon size={16} color="currentColor" />
            Settings
          </button>
          <button type="button" className="account-menu-item" onClick={() => go('/collections')}>
            <FolderIcon size={16} color="currentColor" />
            {activeTeam ? `${activeTeam.name}'s collection` : 'My collections'}
          </button>

          <div className="account-menu-row">
            {theme === 'dark' ? <MoonIcon size={16} color="currentColor" /> : <SunIcon size={16} color="currentColor" />}
            <span>Theme</span>
            {/* Sets the mode explicitly rather than toggling, so picking a side
                from 'system' lands where you clicked instead of flipping. */}
            <div className="account-menu-segmented">
              {THEME_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={settings.appearance.themeMode === mode.id ? 'account-menu-seg-active' : ''}
                  onClick={() => updateSettings('appearance', { themeMode: mode.id })}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="account-menu-item" onClick={() => go('/help')}>
            <HelpIcon size={16} color="currentColor" />
            Help center
          </button>

          <div className="account-menu-divider" />

          <button type="button" className="account-menu-item account-menu-item-danger" onClick={handleSignOut}>
            <LogOutIcon size={16} color="currentColor" />
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
