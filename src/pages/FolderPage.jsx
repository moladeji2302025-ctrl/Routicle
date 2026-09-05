import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { DEPARTMENTS, departmentLabel } from '../data/departments'
import { formatCount } from '../utils/format'
import * as api from '../lib/api'
import {
  FolderIcon,
  GridIcon,
  SortIcon,
  ChevronDownIcon,
  HeartIcon,
  EyeIcon,
  PlusIcon,
} from '../components/icons'

const SORTS = [
  { id: 'added', label: 'Recently added' },
  { id: 'title', label: 'Name' },
  { id: 'appreciated', label: 'Most appreciated' },
]

export default function FolderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser, contentItems, activeTeam, activeTeamId, teamMembers } = useApp()

  const [folder, setFolder] = useState(null)
  const [rows, setRows] = useState(null) // null = loading
  const [view, setView] = useState('grid')
  const [sort, setSort] = useState('added')
  const [department, setDepartment] = useState('')
  const [sortOpen, setSortOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [{ folders }, { items }] = await Promise.all([
        activeTeamId ? api.fetchFolders(activeTeamId) : Promise.resolve({ folders: [] }),
        api.fetchFolderItems(id),
      ])
      setFolder(folders.find((f) => f.id === id) || null)
      setRows(items)
    } catch (err) {
      setError(err.message)
      setRows([])
    }
  }, [id, activeTeamId])

  useEffect(() => {
    setRows(null)
    setError('')
    load()
  }, [load])

  // Folder rows store ids only; resolve them against whatever catalogue this
  // client has and drop anything it can't find rather than rendering a gap.
  const resolved = useMemo(() => {
    if (!rows) return []
    return rows
      .map((row) => {
        const item = contentItems.find((c) => String(c.id) === String(row.contentItemId))
        return item ? { ...item, addedAt: row.addedAt, addedBy: row.addedBy } : null
      })
      .filter(Boolean)
  }, [rows, contentItems])

  const visible = useMemo(() => {
    let list = department ? resolved.filter((i) => i.department === department) : resolved
    if (sort === 'title') list = [...list].sort((a, b) => a.title.localeCompare(b.title))
    else if (sort === 'appreciated') list = [...list].sort((a, b) => b.appreciations - a.appreciations)
    return list
  }, [resolved, department, sort])

  const inFolder = useMemo(() => new Set(resolved.map((i) => String(i.id))), [resolved])
  const addable = useMemo(
    () =>
      contentItems
        .filter((i) => i.moderationStatus === 'approved' && !inFolder.has(String(i.id)))
        .slice(0, 40),
    [contentItems, inFolder]
  )

  const departmentsPresent = DEPARTMENTS.filter((d) => resolved.some((i) => i.department === d.id))

  if (!currentUser) {
    return (
      <div className="dashboard-page dashboard-gate">
        <h1>Sign in to open this folder</h1>
        <button type="button" className="btn-hero-primary" onClick={() => navigate('/signup')}>Sign up free</button>
      </div>
    )
  }

  async function add(itemId) {
    setError('')
    try {
      await api.addFolderItems({ folderId: id, contentItemIds: [String(itemId)], addedBy: currentUser.id })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove(itemId) {
    setError('')
    try {
      await api.removeFolderItem({ folderId: id, contentItemId: String(itemId) })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  function memberName(userId) {
    const m = teamMembers.find((x) => x.userId === userId)
    return m?.user?.name || m?.user?.email || 'someone'
  }

  return (
    <div className="folder-page">
      <div className="folder-page-crumbs">
        <Link to="/team">{activeTeam?.name || 'Team'}</Link>
        <span>/</span>
        <span>{folder?.name || 'Folder'}</span>
      </div>

      <header className="folder-page-head">
        <div className="folder-page-id">
          <span className="folder-page-mark">
            <FolderIcon size={20} color="currentColor" />
          </span>
          <div>
            <h1>{folder?.name || 'Folder'}</h1>
            <p>
              {resolved.length} item{resolved.length === 1 ? '' : 's'}
              {folder?.isDefault ? " · this team's default folder" : ''}
            </p>
          </div>
        </div>

        <div className="folder-page-tools">
          <div className="explore-sort">
            <button type="button" className="explore-sort-btn" onClick={() => setSortOpen((v) => !v)}>
              <SortIcon size={12} color="currentColor" />
              {SORTS.find((s) => s.id === sort).label}
              <ChevronDownIcon size={11} color="currentColor" />
            </button>
            {sortOpen && (
              <div className="explore-sort-menu">
                {SORTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={s.id === sort ? 'explore-sort-item explore-sort-item-active' : 'explore-sort-item'}
                    onClick={() => {
                      setSort(s.id)
                      setSortOpen(false)
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="folder-view-toggle">
            <button
              type="button"
              className={view === 'grid' ? 'folder-view-btn folder-view-btn-active' : 'folder-view-btn'}
              onClick={() => setView('grid')}
              aria-label="Grid view"
            >
              <GridIcon size={14} color="currentColor" />
            </button>
            <button
              type="button"
              className={view === 'list' ? 'folder-view-btn folder-view-btn-active' : 'folder-view-btn'}
              onClick={() => setView('list')}
              aria-label="List view"
            >
              <SortIcon size={14} color="currentColor" />
            </button>
          </div>

          <button type="button" className="settings-btn settings-btn-primary" onClick={() => setPicking((v) => !v)}>
            <PlusIcon size={13} color="currentColor" />
            Add items
          </button>
        </div>
      </header>

      {departmentsPresent.length > 1 && (
        <div className="explore-chip-row" style={{ padding: 0, margin: '18px 0 0' }}>
          <button
            type="button"
            className={department === '' ? 'explore-chip explore-chip-active' : 'explore-chip'}
            onClick={() => setDepartment('')}
          >
            All types
          </button>
          {departmentsPresent.map((d) => (
            <button
              key={d.id}
              type="button"
              className={department === d.id ? 'explore-chip explore-chip-active' : 'explore-chip'}
              onClick={() => setDepartment(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {error && <p className="settings-error">{error}</p>}

      {picking && (
        <section className="folder-picker">
          <h2 className="project-group-title">Add from the library</h2>
          {addable.length === 0 ? (
            <p className="explore-empty">Everything available is already in this folder.</p>
          ) : (
            <div className="folder-picker-grid">
              {addable.map((item) => (
                <button key={item.id} type="button" className="folder-picker-item" onClick={() => add(item.id)}>
                  <img src={item.image} alt="" />
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {rows === null ? (
        <p className="explore-empty">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="page-empty-state">
          <FolderIcon size={26} color="currentColor" />
          <h2>{resolved.length === 0 ? 'This folder is empty' : 'Nothing matches that filter'}</h2>
          <p>
            {resolved.length === 0
              ? 'Add work from the library and everyone on the team sees it here.'
              : 'Try another type, or clear the filter.'}
          </p>
          {resolved.length === 0 && (
            <button type="button" className="settings-btn settings-btn-primary" onClick={() => setPicking(true)}>
              Add items
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="folder-item-grid">
          {visible.map((item) => (
            <div key={item.id} className="folder-item">
              <Link to={`/design/${item.id}`} className="folder-item-media">
                <img src={item.image} alt={item.title} />
              </Link>
              <div className="folder-item-foot">
                <Link to={`/design/${item.id}`} className="folder-item-title">{item.title}</Link>
                <span className="folder-item-meta">
                  {departmentLabel(item.department)} · added by {memberName(item.addedBy)}
                </span>
              </div>
              <button type="button" className="folder-item-remove" onClick={() => remove(item.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="download-list">
          {visible.map((item) => (
            <div key={item.id} className="download-row">
              <img src={item.image} alt="" className="download-thumb" />
              <div className="download-info">
                <span className="download-title">{item.title}</span>
                <span className="download-meta">
                  {departmentLabel(item.department)} · {item.creator} · added by {memberName(item.addedBy)}
                </span>
              </div>
              <span className="project-stat">
                <HeartIcon size={13} color="currentColor" />
                {formatCount(item.appreciations)}
              </span>
              <span className="project-stat">
                <EyeIcon size={13} color="currentColor" />
                {formatCount(item.views)}
              </span>
              <Link to={`/design/${item.id}`} className="settings-btn">Open</Link>
              <button type="button" className="settings-btn settings-btn-ghost" onClick={() => remove(item.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
