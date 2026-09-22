import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import AccountMenu from './AccountMenu'
import { fetchUpdates } from '../lib/api'
import { SearchIcon, BellIcon, PanelIcon, HelpIcon, ChevronRightIcon } from './icons'

const SEEN_KEY = 'routicle_updates_seen'

/** Route segment → readable label. Anything unlisted is title-cased. */
const LABELS = {
  '': 'Home',
  explore: 'Explore',
  categories: 'Categories',
  following: 'Following',
  collections: 'Collections',
  downloads: 'Downloads',
  recents: 'Recents',
  suite: 'AI Suite',
  business: 'Business Suite',
  creative: 'Creative Suite',
  studio: 'Studio',
  upload: 'Upload',
  projects: 'Projects',
  workspaces: 'Workspaces',
  team: 'Team',
  dashboard: 'Earnings',
  settings: 'Settings',
  admin: 'Admin',
  updates: "What's new",
  resources: 'Resources',
  pricing: 'Pricing',
  design: 'Design',
  creator: 'Creator',
  doc: 'Document',
  folder: 'Folder',
}

const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')

/**
 * Builds the trail from the URL rather than from per-page props, so a new page
 * gets a breadcrumb without having to remember to pass one.
 *
 * Raw ids are dropped: "/suite/business/8f3a-…/doc/12b4-…" reads as
 * AI Suite › Business Suite › Document, not as two uuids.
 */
function crumbsFor(pathname) {
  const parts = pathname.split('/').filter(Boolean)
  const out = []
  let href = ''
  for (const part of parts) {
    href += `/${part}`
    const looksLikeId = /^[0-9a-f-]{8,}$/i.test(part) || /^\d+$/.test(part)
    if (looksLikeId) continue
    out.push({ label: LABELS[part] || titleCase(part), to: href })
  }
  return out
}

export default function AppTopBar({ collapsed, onToggleSidebar }) {
  const { currentUser } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [unseen, setUnseen] = useState(false)

  const crumbs = crumbsFor(location.pathname)

  // Ctrl/Cmd-K focuses search from anywhere, which is what the shortcut hint
  // on the field promises.
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The bell only earns a dot when something published is genuinely newer than
  // whatever was last read.
  useEffect(() => {
    let cancelled = false
    fetchUpdates(1)
      .then(({ updates }) => {
        if (cancelled || !updates?.length) return
        let seen = ''
        try {
          seen = localStorage.getItem(SEEN_KEY) || ''
        } catch {
          // storage blocked — fall through and just don't show a dot
        }
        setUnseen(Boolean(updates[0].publishedAt && updates[0].publishedAt > seen))
      })
      .catch(() => {
        // offline, or the API isn't reachable — no dot rather than an error
      })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  function submit(e) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate(`/explore?q=${encodeURIComponent(q)}`)
    inputRef.current?.blur()
  }

  if (!currentUser) return null

  return (
    <header className="app-topbar">
      <div className="app-topbar-left">
        <button
          type="button"
          className="app-topbar-icon"
          onClick={onToggleSidebar}
          aria-label={collapsed ? 'Show sidebar' : 'Hide sidebar'}
          title={collapsed ? 'Show sidebar' : 'Hide sidebar'}
        >
          <PanelIcon size={16} color="currentColor" />
        </button>

        <nav className="app-crumbs" aria-label="Breadcrumb">
          {crumbs.length === 0 ? (
            <span className="app-crumb-current">Home</span>
          ) : (
            crumbs.map((c, i) => (
              <span key={c.to} className="app-crumb">
                {i > 0 && <ChevronRightIcon size={11} color="currentColor" />}
                {i === crumbs.length - 1 ? (
                  <span className="app-crumb-current">{c.label}</span>
                ) : (
                  <Link to={c.to}>{c.label}</Link>
                )}
              </span>
            ))
          )}
        </nav>
      </div>

      <form className="app-topbar-search" onSubmit={submit} role="search">
        <SearchIcon size={14} color="currentColor" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Search everything…"
          onChange={(e) => setQuery(e.target.value)}
        />
        <kbd>Ctrl K</kbd>
      </form>

      <div className="app-topbar-right">
        <Link to="/resources" className="app-topbar-btn">Docs</Link>
        <Link to="/help" className="app-topbar-btn">
          <HelpIcon size={14} color="currentColor" />
          Help
        </Link>
        <Link
          to="/updates"
          className="app-topbar-icon"
          aria-label={unseen ? "What's new, unread" : "What's new"}
          title="What's new"
        >
          <BellIcon size={16} color="currentColor" />
          {unseen && <span className="app-topbar-dot" />}
        </Link>
        <AccountMenu />
      </div>
    </header>
  )
}
