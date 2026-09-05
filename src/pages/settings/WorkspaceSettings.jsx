import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { TIERS } from '../../data/pricing'
import { Section, Row, Feedback, DangerZone } from '../../components/settings/SettingsControls'
import { UserIcon, UsersIcon } from '../../components/icons'

const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member' }

export default function WorkspaceSettings() {
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

  const [teamName, setTeamName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const canManage = activeTeam?.role === 'owner' || activeTeam?.role === 'admin'

  async function run(key, fn, successMessage) {
    setBusy(key)
    setError('')
    setNotice('')
    try {
      await fn()
      if (successMessage) setNotice(successMessage)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <Section
        title="Active workspace"
        description="Collections, download history and billing all follow whichever workspace is active."
      >
        <button
          type="button"
          className={!activeTeamId ? 'settings-workspace-row settings-workspace-row-active' : 'settings-workspace-row'}
          onClick={() => setActiveTeam(null)}
        >
          <UserIcon size={16} color="currentColor" />
          <div className="settings-row-text">
            <span className="settings-row-title">Personal</span>
            <span className="settings-row-desc">Just you — your own plan and collections.</span>
          </div>
          {!activeTeamId && <span className="settings-pill">Active</span>}
        </button>

        {teams.map((team) => (
          <button
            key={team.id}
            type="button"
            className={
              activeTeamId === team.id ? 'settings-workspace-row settings-workspace-row-active' : 'settings-workspace-row'
            }
            onClick={() => setActiveTeam(team.id)}
          >
            <UsersIcon size={16} color="currentColor" />
            <div className="settings-row-text">
              <span className="settings-row-title">{team.name}</span>
              <span className="settings-row-desc">
                {ROLE_LABEL[team.role] || 'Member'} · {TIERS[team.tier]?.label || 'Free'} plan
              </span>
            </div>
            {activeTeamId === team.id && <span className="settings-pill">Active</span>}
          </button>
        ))}

        <Feedback error={error} notice={notice} />
      </Section>

      <Section title="Create a team" description="Everyone you invite shares the workspace's plan, collections and downloads.">
        <div className="settings-inline-form">
          <input
            type="text"
            className="settings-input"
            value={teamName}
            placeholder="Team name"
            onChange={(e) => setTeamName(e.target.value)}
          />
          <button
            type="button"
            className="settings-btn settings-btn-primary"
            disabled={!teamName.trim() || busy === 'create'}
            onClick={() =>
              run('create', async () => {
                await createTeam(teamName.trim())
                setTeamName('')
              }, 'Team created and made active.')
            }
          >
            {busy === 'create' ? 'Creating…' : 'Create team'}
          </button>
        </div>
      </Section>

      {activeTeam && (
        <>
          <Section
            title={`${activeTeam.name} — plan`}
            description={
              canManage
                ? "Sets the tier every member inherits while this workspace is active."
                : 'Only owners and admins can change the shared plan.'
            }
          >
            <Row title="Shared tier" description={`You're ${ROLE_LABEL[activeTeam.role] || 'a member'} of this team.`}>
              <div className="settings-seg">
                {Object.values(TIERS).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={
                      (activeTeam.tier || 'free') === t.id ? 'settings-seg-btn settings-seg-btn-active' : 'settings-seg-btn'
                    }
                    disabled={!canManage}
                    onClick={() => run('tier', () => setTeamTier(activeTeam.id, t.id))}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Row>
          </Section>

          <Section
            title={`${activeTeam.name} — members`}
            description={`${teamMembers.length} member${teamMembers.length === 1 ? '' : 's'}.`}
            actions={
              <Link to="/team" className="settings-btn settings-btn-ghost">
                Full team page
              </Link>
            }
          >
            {teamMembers.map((m) => (
              <div key={m.id} className="settings-list-row">
                {m.user?.image ? (
                  <img src={m.user.image} alt="" className="settings-list-avatar" />
                ) : (
                  <span className="settings-list-avatar settings-avatar-fallback">
                    <UserIcon size={14} color="currentColor" />
                  </span>
                )}
                <div className="settings-row-text">
                  <span className="settings-row-title">{m.user?.name || m.user?.email}</span>
                  <span className="settings-row-desc">{m.user?.email}</span>
                </div>
                <span className="settings-pill">{ROLE_LABEL[m.role] || m.role}</span>
                {canManage && m.role !== 'owner' && m.userId !== currentUser.id && (
                  <button
                    type="button"
                    className="settings-btn settings-btn-ghost"
                    onClick={() => run(`remove-${m.id}`, () => removeTeamMember(m.id))}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            {canManage && (
              <div className="settings-inline-form">
                <input
                  type="email"
                  className="settings-input"
                  value={inviteEmail}
                  placeholder="Invite by email"
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <button
                  type="button"
                  className="settings-btn settings-btn-primary"
                  disabled={!inviteEmail.trim() || busy === 'invite'}
                  onClick={() =>
                    run('invite', async () => {
                      await inviteTeamMember(inviteEmail.trim())
                      setInviteEmail('')
                    }, `Invite sent to ${inviteEmail.trim()}.`)
                  }
                >
                  {busy === 'invite' ? 'Inviting…' : 'Send invite'}
                </button>
              </div>
            )}
          </Section>

          <DangerZone
            title="Leave this team"
            description="You lose access to its shared collections, downloads and plan immediately."
          >
            <Row title={activeTeam.name} description={`You're ${ROLE_LABEL[activeTeam.role] || 'a member'}.`}>
              <button
                type="button"
                className="settings-btn settings-btn-danger"
                disabled={busy === 'leave'}
                onClick={() => run('leave', () => leaveTeam(activeTeam.id), 'You left the team.')}
              >
                {busy === 'leave' ? 'Leaving…' : 'Leave team'}
              </button>
            </Row>
          </DangerZone>
        </>
      )}
    </>
  )
}
