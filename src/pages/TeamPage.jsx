import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { TIERS } from '../data/pricing'
import { UsersIcon, UserIcon } from '../components/icons'

const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member' }

export default function TeamPage() {
  const {
    currentUser,
    teams,
    activeTeam,
    activeTeamId,
    teamMembers,
    setActiveTeam,
    createTeam,
    inviteTeamMember,
    removeTeamMember,
    leaveTeam,
    setTeamTier,
  } = useApp()
  const navigate = useNavigate()

  const [teamName, setTeamName] = useState('')
  const [creating, setCreating] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const canManage = activeTeam?.role === 'owner' || activeTeam?.role === 'admin'

  if (!currentUser) {
    return (
      <div className="dashboard-page dashboard-gate">
        <h1>Sign in to create or join a team</h1>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/signup')}>Sign up free</button>
      </div>
    )
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!teamName.trim() || creating) return
    setCreating(true)
    setError('')
    try {
      await createTeam(teamName.trim())
      setTeamName('')
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim() || inviting) return
    setInviting(true)
    setError('')
    setNotice('')
    try {
      await inviteTeamMember(inviteEmail.trim())
      setNotice(`Invited ${inviteEmail.trim()}.`)
      setInviteEmail('')
    } catch (err) {
      setError(err.message)
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove(memberId) {
    try {
      await removeTeamMember(memberId)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleLeave() {
    if (!activeTeamId) return
    try {
      await leaveTeam(activeTeamId)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="team-page">
      <h1 className="deck-heading">Teams</h1>
      <div className="deck-accent" aria-hidden="true" />
      <p className="team-page-intro">
        A team is a shared workspace: collections, download history, and plan are shared by
        everyone in it. Switch which one is active from your account menu.
      </p>

      {teams.length > 0 && (
        <div className="team-picker">
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              className={activeTeamId === team.id ? 'team-picker-item team-picker-item-active' : 'team-picker-item'}
              onClick={() => setActiveTeam(team.id)}
            >
              <UsersIcon size={16} color="currentColor" />
              {team.name}
            </button>
          ))}
        </div>
      )}

      {error && <p className="team-page-error">{error}</p>}
      {notice && <p className="team-page-notice">{notice}</p>}

      {activeTeam ? (
        <div className="team-panel">
          <div className="team-panel-head">
            <div>
              <h2>{activeTeam.name}</h2>
              <p className="team-page-role">You're {activeTeam.role ? ROLE_LABEL[activeTeam.role] || activeTeam.role : 'a member'}</p>
            </div>
            <button type="button" className="hero-deck-btn-secondary" onClick={handleLeave}>
              Leave team
            </button>
          </div>

          <section className="team-section">
            <h3>Plan</h3>
            <p className="team-section-desc">Shared by every member — same mock-billing pattern as personal plans; no live payment charge is made.</p>
            <div className="team-plan-row">
              {Object.values(TIERS).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={activeTeam.tier === t.id || (!activeTeam.tier && t.id === 'free') ? 'team-plan-btn team-plan-btn-active' : 'team-plan-btn'}
                  onClick={() => canManage && setTeamTier(activeTeam.id, t.id)}
                  disabled={!canManage}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          <section className="team-section">
            <h3>Members</h3>
            <div className="team-member-list">
              {teamMembers.map((m) => (
                <div key={m.id} className="team-member-row">
                  {m.user?.image ? (
                    <img src={m.user.image} alt="" className="team-member-avatar" />
                  ) : (
                    <span className="team-member-avatar team-member-avatar-fallback">
                      <UserIcon size={14} color="currentColor" />
                    </span>
                  )}
                  <div className="team-member-info">
                    <span className="team-member-name">{m.user?.name || m.user?.email}</span>
                    <span className="team-member-email">{m.user?.email}</span>
                  </div>
                  <span className="account-menu-badge">{ROLE_LABEL[m.role] || m.role}</span>
                  {canManage && m.role !== 'owner' && m.userId !== currentUser?.id && (
                    <button type="button" className="team-member-remove" onClick={() => handleRemove(m.id)}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            {canManage && (
              <form className="team-invite-form" onSubmit={handleInvite}>
                <input
                  type="email"
                  placeholder="Invite by email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
                <button type="submit" className="hero-deck-btn-primary" disabled={inviting}>
                  {inviting ? 'Inviting…' : 'Invite'}
                </button>
              </form>
            )}
          </section>
        </div>
      ) : (
        <form className="team-create-form" onSubmit={handleCreate}>
          <h2>Create a team</h2>
          <p className="team-section-desc">Give it a name — you can invite people once it's created.</p>
          <div className="team-create-row">
            <input
              type="text"
              placeholder="Team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
            />
            <button type="submit" className="hero-deck-btn-primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create team'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
