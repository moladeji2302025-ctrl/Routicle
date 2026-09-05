import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { TIERS } from '../data/pricing'
import * as api from '../lib/api'
import FolderCard from '../components/FolderCard'
import {
  UsersIcon,
  UserIcon,
  PlusIcon,
  FolderIcon,
  HeartIcon,
  CardIcon,
  ChevronRightIcon,
} from '../components/icons'

const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member' }

export default function TeamPage() {
  const {
    currentUser,
    contentItems,
    teams,
    activeTeam,
    activeTeamId,
    teamMembers,
    subscription,
    setActiveTeam,
    createTeam,
    inviteTeamMember,
    removeTeamMember,
    leaveTeam,
    deleteTeam,
  } = useApp()
  const navigate = useNavigate()

  const [teamName, setTeamName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [folders, setFolders] = useState(null) // null = loading
  const [newFolder, setNewFolder] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmDelete, setConfirmDelete] = useState('')

  const isOwner = activeTeam?.role === 'owner'
  const canManage = isOwner || activeTeam?.role === 'admin'

  const loadFolders = useCallback(async (teamId) => {
    if (!teamId) {
      setFolders([])
      return
    }
    try {
      const { folders: rows } = await api.fetchFolders(teamId)
      setFolders(rows)
    } catch (err) {
      console.error('fetchFolders failed', err)
      setFolders([])
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    setFolders(null)
    setError('')
    loadFolders(activeTeamId)
  }, [activeTeamId, loadFolders])

  const savedCount = currentUser?.savedItemIds?.length ?? 0
  const totalFoldered = useMemo(
    () => (folders || []).reduce((sum, f) => sum + f.itemCount, 0),
    [folders]
  )

  if (!currentUser) {
    return (
      <div className="dashboard-page dashboard-gate">
        <h1>Sign in to create or join a team</h1>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/signup')}>Sign up free</button>
      </div>
    )
  }

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

  /* ---- No team yet ---- */
  if (!activeTeam) {
    return (
      <div className="team-page">
        <h1 className="deck-heading">Teams</h1>
        <div className="deck-accent" aria-hidden="true" />
        <p className="team-page-intro">
          A team is a shared workspace: folders, collections, download history and one plan for
          everybody in it.
        </p>

        {teams.length > 0 && (
          <div className="team-picker">
            {teams.map((team) => (
              <button key={team.id} type="button" className="team-picker-item" onClick={() => setActiveTeam(team.id)}>
                <UsersIcon size={16} color="currentColor" />
                {team.name}
              </button>
            ))}
          </div>
        )}

        {error && <p className="team-page-error">{error}</p>}

        <form
          className="team-create-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!teamName.trim()) return
            run('create', async () => {
              await createTeam(teamName.trim())
              setTeamName('')
            }, 'Team created, with a Team folder ready to fill.')
          }}
        >
          <h2>Create a team</h2>
          <p className="team-section-desc">
            You'll get a shared Team folder straight away. Invite people once it exists.
          </p>
          <div className="team-create-row">
            <input
              type="text"
              placeholder="Team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
            />
            <button type="submit" className="hero-deck-btn-primary" disabled={busy === 'create'}>
              {busy === 'create' ? 'Creating…' : 'Create team'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  /* ---- Active team ---- */
  const tier = activeTeam.tier || subscription?.tier || 'free'

  return (
    <div className="team-page team-page-wide">
      <header className="team-hero">
        <div className="team-hero-id">
          <span className="team-hero-mark">{activeTeam.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <h1 className="team-hero-name">{activeTeam.name}</h1>
            <p className="team-hero-meta">
              {TIERS[tier]?.label || 'Free'} plan · {teamMembers.length} member
              {teamMembers.length === 1 ? '' : 's'} · you're {ROLE_LABEL[activeTeam.role] || 'a member'}
            </p>
          </div>
        </div>

        <div className="team-hero-actions">
          <div className="team-avatar-stack">
            {teamMembers.slice(0, 5).map((m) =>
              m.user?.image ? (
                <img key={m.id} src={m.user.image} alt="" className="team-avatar-stack-img" title={m.user?.name || m.user?.email} />
              ) : (
                <span key={m.id} className="team-avatar-stack-img team-avatar-stack-fallback" title={m.user?.name || m.user?.email}>
                  {(m.user?.name || m.user?.email || '?').slice(0, 1).toUpperCase()}
                </span>
              )
            )}
            {teamMembers.length > 5 && <span className="team-avatar-stack-more">+{teamMembers.length - 5}</span>}
          </div>
          {teams.length > 1 && (
            <Link to="/workspaces" className="settings-btn">Switch</Link>
          )}
          <Link to="/settings/plan" className="settings-btn">Plan</Link>
        </div>
      </header>

      <div className="team-stat-row">
        <Link to="/collections" className="team-stat">
          <HeartIcon size={15} color="currentColor" />
          <span className="team-stat-value">{savedCount}</span>
          <span className="team-stat-label">Saved to the shared collection</span>
        </Link>
        <div className="team-stat">
          <FolderIcon size={15} color="currentColor" />
          <span className="team-stat-value">{folders === null ? '—' : folders.length}</span>
          <span className="team-stat-label">Folder{folders?.length === 1 ? '' : 's'} · {totalFoldered} item{totalFoldered === 1 ? '' : 's'}</span>
        </div>
        <Link to="/downloads" className="team-stat">
          <CardIcon size={15} color="currentColor" />
          <span className="team-stat-value">{TIERS[tier]?.label || 'Free'}</span>
          <span className="team-stat-label">Shared plan · view download history</span>
        </Link>
      </div>

      {error && <p className="team-page-error">{error}</p>}
      {notice && <p className="team-page-notice">{notice}</p>}

      {/* ---- Folders ---- */}
      <section className="team-section">
        <div className="team-section-head">
          <div>
            <h2>Folders</h2>
            <p className="team-section-desc">
              Shared by everyone on this team. Anyone can open them; {canManage ? 'you can' : 'owners and admins can'} create and rename.
            </p>
          </div>
        </div>

        {folders === null ? (
          <p className="explore-empty">Loading folders…</p>
        ) : (
          <div className="folder-grid">
            {folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                items={contentItems}
                canManage={canManage}
                onStar={() =>
                  run(`star-${folder.id}`, async () => {
                    await api.updateFolder({ id: folder.id, isStarred: !folder.isStarred })
                    await loadFolders(activeTeamId)
                  })
                }
                onRename={(name) =>
                  run(`rename-${folder.id}`, async () => {
                    await api.updateFolder({ id: folder.id, name })
                    await loadFolders(activeTeamId)
                  })
                }
                onDelete={() =>
                  run(`del-${folder.id}`, async () => {
                    await api.deleteFolder(folder.id)
                    await loadFolders(activeTeamId)
                  }, 'Folder deleted.')
                }
              />
            ))}

            {canManage && (
              <form
                className="folder-card folder-card-new"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!newFolder.trim()) return
                  run('folder', async () => {
                    await api.createFolder({
                      organizationId: activeTeamId,
                      name: newFolder.trim(),
                      createdBy: currentUser.id,
                    })
                    setNewFolder('')
                    await loadFolders(activeTeamId)
                  })
                }}
              >
                <span className="folder-card-icon">
                  <PlusIcon size={18} color="currentColor" />
                </span>
                <input
                  type="text"
                  className="settings-input"
                  value={newFolder}
                  placeholder="New folder name"
                  onChange={(e) => setNewFolder(e.target.value)}
                />
                <button type="submit" className="settings-btn settings-btn-primary" disabled={!newFolder.trim() || busy === 'folder'}>
                  {busy === 'folder' ? 'Creating…' : 'Create folder'}
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      {/* ---- Members ---- */}
      <section className="team-section">
        <div className="team-section-head">
          <div>
            <h2>Members</h2>
            <p className="team-section-desc">Everyone here shares the plan, the folders and the download history.</p>
          </div>
        </div>

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
              {canManage && m.role !== 'owner' && m.userId !== currentUser.id && (
                <button
                  type="button"
                  className="team-member-remove"
                  onClick={() => run(`remove-${m.id}`, () => removeTeamMember(m.id))}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {canManage && (
          <form
            className="team-invite-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!inviteEmail.trim()) return
              run('invite', async () => {
                await inviteTeamMember(inviteEmail.trim())
                setInviteEmail('')
              }, `Invite sent to ${inviteEmail.trim()}.`)
            }}
          >
            <input
              type="email"
              placeholder="Invite by email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <button type="submit" className="hero-deck-btn-primary" disabled={busy === 'invite'}>
              {busy === 'invite' ? 'Inviting…' : 'Invite'}
            </button>
          </form>
        )}
      </section>

      {/* ---- Leaving / deleting ---- */}
      <section className="team-section">
        <div className="team-section-head">
          <div>
            <h2 className="settings-danger-title">Danger zone</h2>
            <p className="team-section-desc">
              {isOwner
                ? 'Deleting this workspace removes its folders, shared collection and download history for every member. Only you, the owner, can do it.'
                : 'Leaving gives up your access to this workspace immediately. Only the owner can delete it outright.'}
            </p>
          </div>
        </div>

        <div className="settings-card settings-card-danger">
          <div className="settings-row">
            <div className="settings-row-text">
              <span className="settings-row-title">Leave {activeTeam.name}</span>
              <span className="settings-row-desc">You can be re-invited later.</span>
            </div>
            <button
              type="button"
              className="settings-btn settings-btn-danger"
              disabled={busy === 'leave'}
              onClick={() => run('leave', () => leaveTeam(activeTeam.id), 'You left the team.')}
            >
              {busy === 'leave' ? 'Leaving…' : 'Leave team'}
            </button>
          </div>

          {isOwner && (
            <div className="settings-row settings-row-stacked">
              <div className="settings-row-text">
                <span className="settings-row-title">Delete this workspace</span>
                <span className="settings-row-desc">
                  Type <strong>{activeTeam.name}</strong> to confirm. This can't be undone.
                </span>
              </div>
              <div className="settings-delete-row">
                <input
                  type="text"
                  className="settings-input"
                  value={confirmDelete}
                  placeholder={activeTeam.name}
                  onChange={(e) => setConfirmDelete(e.target.value)}
                />
                <button
                  type="button"
                  className="settings-btn settings-btn-danger"
                  disabled={confirmDelete !== activeTeam.name || busy === 'delete'}
                  onClick={() =>
                    run('delete', async () => {
                      await deleteTeam(activeTeam.id)
                      setConfirmDelete('')
                    }, 'Workspace deleted.')
                  }
                >
                  {busy === 'delete' ? 'Deleting…' : 'Delete workspace'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <Link to="/workspaces" className="team-page-footlink">
        All workspaces <ChevronRightIcon size={12} color="currentColor" />
      </Link>
    </div>
  )
}
