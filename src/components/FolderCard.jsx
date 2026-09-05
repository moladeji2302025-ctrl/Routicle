import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { StarIcon, FolderIcon } from './icons'

function timeAgo(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days === 0) return 'Edited today'
  if (days === 1) return 'Edited yesterday'
  if (days < 30) return `Edited ${days} days ago`
  return `Edited ${d.toLocaleDateString()}`
}

/**
 * One folder in a team's grid: a cover built from its newest items, the name,
 * when it last changed, and (for owners/admins) star / rename / delete.
 */
export default function FolderCard({ folder, items, canManage, onStar, onRename, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(folder.name)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // Folder rows hold ids only; anything the local catalogue can't resolve is
  // skipped rather than rendered as a broken tile.
  const covers = folder.itemIds
    .map((id) => items.find((item) => String(item.id) === String(id)))
    .filter(Boolean)
    .slice(0, 4)

  if (renaming) {
    return (
      <form
        className="folder-card folder-card-new"
        onSubmit={(e) => {
          e.preventDefault()
          if (draft.trim() && draft.trim() !== folder.name) onRename(draft.trim())
          setRenaming(false)
        }}
      >
        <span className="folder-card-icon">
          <FolderIcon size={18} color="currentColor" />
        </span>
        <input
          type="text"
          className="settings-input"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="settings-inline-actions">
          <button type="submit" className="settings-btn settings-btn-primary">Save</button>
          <button
            type="button"
            className="settings-btn settings-btn-ghost"
            onClick={() => {
              setDraft(folder.name)
              setRenaming(false)
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="folder-card">
      <Link to={`/team/folder/${folder.id}`} className="folder-card-cover">
        {covers.length === 0 ? (
          <span className="folder-card-empty">
            <FolderIcon size={22} color="currentColor" />
            Empty
          </span>
        ) : (
          <span className={`folder-card-tiles folder-card-tiles-${Math.min(covers.length, 4)}`}>
            {covers.map((item) => (
              <img key={item.id} src={item.image} alt="" />
            ))}
          </span>
        )}
      </Link>

      <div className="folder-card-foot">
        <span className="folder-card-mark">
          <FolderIcon size={14} color="currentColor" />
        </span>
        <div className="folder-card-text">
          <Link to={`/team/folder/${folder.id}`} className="folder-card-name">
            {folder.name}
            {folder.isDefault && <span className="folder-card-tag">Team</span>}
          </Link>
          <span className="folder-card-meta">
            {folder.itemCount} item{folder.itemCount === 1 ? '' : 's'} · {timeAgo(folder.updatedAt)}
          </span>
        </div>

        {canManage && (
          <div className="folder-card-controls" ref={menuRef}>
            <button
              type="button"
              className={folder.isStarred ? 'folder-star folder-star-on' : 'folder-star'}
              onClick={onStar}
              aria-label={folder.isStarred ? 'Unstar folder' : 'Star folder'}
            >
              <StarIcon size={13} color="currentColor" />
            </button>
            <button
              type="button"
              className="folder-menu-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="folder-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    setRenaming(true)
                  }}
                >
                  Rename
                </button>
                {/* The team's own folder is where loose items live, so it stays. */}
                {!folder.isDefault && (
                  <button
                    type="button"
                    role="menuitem"
                    className="folder-menu-danger"
                    onClick={() => {
                      setMenuOpen(false)
                      onDelete()
                    }}
                  >
                    Delete folder
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
