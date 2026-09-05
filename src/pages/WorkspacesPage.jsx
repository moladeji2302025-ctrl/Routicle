import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { TIERS } from '../data/pricing'
import { UserIcon, UsersIcon, PlusIcon } from '../components/icons'

const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member' }

export default function WorkspacesPage() {
  const {
    currentUser,
    teams,
    activeTeamId,
    activeTeam,
    teamMembers,
    subscription,
    setActiveTeam,
    createTeam,
  } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  if (!currentUser) {
    return (
      <div className="dashboard-page dashboard-gate">
        <h1>Sign in to see your workspaces</h1>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/signup')}>Sign up free</button>
      </div>
    )
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim() || creating) return
    setCreating(true)
    setError('')
    try {
      await createTeam(name.trim())
      setName('')
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="explore-page">
      <h1 className="deck-heading">Workspaces</h1>
      <div className="deck-accent" aria-hidden="true" />
      <p className="explore-count" style={{ marginTop: 18 }}>
        A workspace owns its own collections, download history and plan. Switching here changes
        what you see everywhere else in the app.
      </p>

      {error && <p className="settings-error">{error}</p>}

      <div className="workspace-card-grid">
        <button
          type="button"
          className={!activeTeamId ? 'workspace-card workspace-card-active' : 'workspace-card'}
          onClick={() => setActiveTeam(null)}
        >
          <span className="workspace-card-icon">
            <UserIcon size={18} color="currentColor" />
          </span>
          <span className="workspace-card-name">Personal</span>
          <span className="workspace-card-meta">
            {TIERS[subscription?.tier || 'free']?.label || 'Free'} plan · just you
          </span>
          <span className="workspace-card-foot">
            {!activeTeamId ? <span className="settings-pill">Active</span> : <span className="workspace-card-switch">Switch to this</span>}
          </span>
        </button>

        {teams.map((team) => {
          const isActive = activeTeamId === team.id
          return (
            <button
              key={team.id}
              type="button"
              className={isActive ? 'workspace-card workspace-card-active' : 'workspace-card'}
              onClick={() => setActiveTeam(team.id)}
            >
              <span className="workspace-card-icon">
                <UsersIcon size={18} color="currentColor" />
              </span>
              <span className="workspace-card-name">{team.name}</span>
              <span className="workspace-card-meta">
                {TIERS[team.tier || 'free']?.label || 'Free'} plan · you're {ROLE_LABEL[team.role] || 'a member'}
                {isActive && teamMembers.length > 0
                  ? ` · ${teamMembers.length} member${teamMembers.length === 1 ? '' : 's'}`
                  : ''}
              </span>
              <span className="workspace-card-foot">
                {isActive ? <span className="settings-pill">Active</span> : <span className="workspace-card-switch">Switch to this</span>}
              </span>
            </button>
          )
        })}

        <form className="workspace-card workspace-card-new" onSubmit={handleCreate}>
          <span className="workspace-card-icon">
            <PlusIcon size={18} color="currentColor" />
          </span>
          <span className="workspace-card-name">New workspace</span>
          <span className="workspace-card-meta">Share a plan, collections and downloads with your team.</span>
          <input
            type="text"
            className="settings-input"
            value={name}
            placeholder="Workspace name"
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="settings-btn settings-btn-primary" disabled={!name.trim() || creating}>
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
      </div>

      {activeTeam && (
        <div className="workspace-actions">
          <Link to="/team" className="settings-btn">Manage {activeTeam.name}</Link>
          <Link to="/collections" className="settings-btn">Shared collection</Link>
          <Link to="/downloads" className="settings-btn">Shared downloads</Link>
          <Link to="/settings/plan" className="settings-btn">Plan &amp; billing</Link>
        </div>
      )}
    </div>
  )
}
