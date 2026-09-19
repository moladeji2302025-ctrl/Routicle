import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { CATEGORIES, categoryLabel } from '../data/categories'
import { CREATORS, getCreatorByName } from '../data/creators'
import { applyBrowsingFilters } from '../data/settings'
import { TIERS } from '../data/pricing'
import { formatCount } from '../utils/format'
import WhatsNew from '../components/WhatsNew'
import {
  SearchIcon,
  GridIcon,
  ImageIcon,
  VideoIcon,
  UploadIcon,
  FolderIcon,
  StarIcon,
  UsersIcon,
  HeartIcon,
  EyeIcon,
  ChartIcon,
  SparkleIcon,
  PlusIcon,
  ChevronRightIcon,
  SettingsIcon,
  UserIcon,
  LockIcon,
} from '../components/icons'
import Thumb from '../components/Thumb'

/* A stable colour per workspace, so the dot next to a name means the same thing
   every time you look at it rather than shuffling on re-render. */
const WS_DOTS = ['#f5b53f', '#8b76f0', '#3fbf86', '#e8596b', '#4aa8e0', '#e07f3f']

function dotFor(id) {
  let h = 0
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return WS_DOTS[h % WS_DOTS.length]
}

/** The loose stack of frames from the empty state — decorative only. */
function SpaceGlyph() {
  return (
    <svg width="132" height="96" viewBox="0 0 132 96" fill="none" aria-hidden="true" className="app-ws-glyph">
      <rect x="31" y="3" width="56" height="30" rx="6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="52" width="58" height="42" rx="6" stroke="currentColor" strokeWidth="1.5" />
      <rect x="73" y="44" width="58" height="42" rx="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 66h30M12 74h22M12 82h26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M88 33c4 10 4 14 10 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Entrance props for one block on the dashboard.
 *
 * The delay is inline rather than an :nth-child rule because the blocks are
 * conditional — a creator sees panels a browsing account does not — and
 * nth-child would count whatever happened to render, so the rhythm would
 * change depending on who you are.
 */
const rise = (step) => ({
  className: 'app-rise',
  style: { animationDelay: `${step * 70}ms` },
})

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function AppHomePage() {
  const {
    currentUser,
    contentItems,
    subscription,
    teams,
    activeTeam,
    teamMembers,
    recentlyViewed,
    settings,
    toggleFollow,
    activeTeamId,
    setActiveTeam,
    createTeam,
  } = useApp()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [openSuggestions, setOpenSuggestions] = useState(false)
  const [cursor, setCursor] = useState(0)
  const searchRef = useRef(null)

  const [naming, setNaming] = useState(false)
  const [wsName, setWsName] = useState('')
  const [creatingWs, setCreatingWs] = useState(false)
  const [wsError, setWsError] = useState('')

  // Every rail, count and command-bar result on this page comes off `approved`,
  // so applying the browsing preferences once here covers the whole dashboard.
  const approved = useMemo(
    () =>
      applyBrowsingFilters(
        contentItems.filter((item) => item.moderationStatus === 'approved'),
        settings.browsing
      ),
    [contentItems, settings.browsing]
  )

  /* ---- Command bar: real matches across designs, creators and categories ---- */
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out = []

    CATEGORIES.filter((d) => d.label.toLowerCase().includes(q))
      .slice(0, 2)
      .forEach((d) => out.push({ kind: 'Category', label: d.label, to: `/explore?category=${d.id}` }))

    CREATORS.filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((c) => out.push({ kind: 'Creator', label: c.name, sub: c.specialty, to: `/creator/${c.id}` }))

    approved
      .filter((i) => i.title.toLowerCase().includes(q) || i.creator.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((i) => out.push({ kind: 'Design', label: i.title, sub: i.creator, image: i.image, to: `/design/${i.id}` }))

    return out.slice(0, 8)
  }, [query, approved])

  // Cmd/Ctrl-K focuses the bar from anywhere on the page.
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => setCursor(0), [query])

  async function handleCreateWorkspace(e) {
    e.preventDefault()
    if (!wsName.trim() || creatingWs) return
    setCreatingWs(true)
    setWsError('')
    try {
      // createTeam switches to the new workspace itself, so the stage panel
      // beside the list updates without a second click.
      await createTeam(wsName.trim())
      setWsName('')
      setNaming(false)
    } catch (err) {
      setWsError(err.message)
    } finally {
      setCreatingWs(false)
    }
  }

  function go(to) {
    setOpenSuggestions(false)
    setQuery('')
    navigate(to)
  }

  function handleSearchKeyDown(e) {
    if (!openSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => (c + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => (c - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Escape') {
      setOpenSuggestions(false)
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault()
    const picked = openSuggestions && suggestions[cursor]
    if (picked) return go(picked.to)
    navigate(query.trim() ? `/explore?q=${encodeURIComponent(query.trim())}` : '/explore')
  }

  /* ---- Real data for each panel ---- */
  const recentItems = useMemo(
    () =>
      recentlyViewed
        .map((id) => approved.find((i) => String(i.id) === String(id)))
        .filter(Boolean)
        .slice(0, 6),
    [recentlyViewed, approved]
  )

  const savedItems = useMemo(
    () => approved.filter((i) => currentUser?.savedItemIds.includes(i.id)).slice(0, 4),
    [approved, currentUser]
  )

  const freshItems = useMemo(() => approved.slice(0, 10), [approved])

  const categoryCounts = useMemo(
    () =>
      CATEGORIES.map((d) => ({
        ...d,
        count: approved.filter((i) => i.category === d.id).length,
        cover: approved.find((i) => i.category === d.id)?.image,
      })),
    [approved]
  )

  const suggestedCreators = useMemo(() => {
    const counts = new Map()
    approved.forEach((i) => counts.set(i.creator, (counts.get(i.creator) || 0) + 1))
    return CREATORS.map((c) => ({ ...c, works: counts.get(c.name) || 0 }))
      .filter((c) => c.works > 0 && !currentUser?.followingCreatorIds?.includes(c.id))
      .sort((a, b) => b.works - a.works)
      .slice(0, 4)
  }, [approved, currentUser])

  const tier = subscription?.tier || 'free'
  const plan = TIERS[tier]
  const imageMax = plan?.imageCredits || 0
  const videoMax = plan?.videoCredits || 0

  const tools = [
    { label: 'Explore', to: '/explore', icon: GridIcon },
    { label: 'Categories', to: '/categories', icon: FolderIcon },
    { label: 'AI Image', to: '/studio/image', icon: ImageIcon },
    { label: 'AI Video', to: '/studio/video', icon: VideoIcon },
    { label: 'Collections', to: '/collections', icon: HeartIcon },
    { label: 'Team', to: '/team', icon: UsersIcon },
    ...(currentUser?.isCreator
      ? [
          { label: 'Upload', to: '/upload', icon: UploadIcon },
          { label: 'Earnings', to: '/dashboard', icon: ChartIcon },
        ]
      : [{ label: 'Pricing', to: '/pricing', icon: StarIcon }]),
    ...(currentUser?.isAdmin ? [{ label: 'Moderation', to: '/admin', icon: SparkleIcon }] : []),
    { label: 'Settings', to: '/settings', icon: SettingsIcon },
  ]

  return (
    <div className="app-home">
      <h1 className="app-home-greeting app-rise" style={{ animationDelay: '0ms' }}>
        {greeting()}, {currentUser?.name?.split(' ')[0] || 'there'}
      </h1>
      <p className="app-home-sub app-rise" style={{ animationDelay: '70ms' }}>
        {approved.length} finished piece{approved.length === 1 ? '' : 's'} in the library right now
        {activeTeam ? ` · working in ${activeTeam.name}` : ''}
      </p>

      <form className="app-home-search app-rise" style={{ animationDelay: '140ms' }} onSubmit={handleSearchSubmit} role="search">
        <SearchIcon size={16} color="currentColor" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search designs, creators or categories…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpenSuggestions(true)
          }}
          onFocus={() => setOpenSuggestions(true)}
          onBlur={() => setTimeout(() => setOpenSuggestions(false), 120)}
          onKeyDown={handleSearchKeyDown}
        />
        <kbd className="app-home-kbd">Ctrl K</kbd>

        {openSuggestions && suggestions.length > 0 && (
          <div className="app-suggest">
            {suggestions.map((s, i) => (
              <button
                type="button"
                key={`${s.kind}-${s.label}`}
                className={i === cursor ? 'app-suggest-row app-suggest-row-active' : 'app-suggest-row'}
                onMouseEnter={() => setCursor(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(s.to)}
              >
                {s.image ? (
                  <img src={s.image} alt="" className="app-suggest-thumb" />
                ) : (
                  <span className="app-suggest-thumb app-suggest-thumb-icon">
                    {s.kind === 'Creator' ? <UsersIcon size={13} color="currentColor" /> : <FolderIcon size={13} color="currentColor" />}
                  </span>
                )}
                <span className="app-suggest-label">{s.label}</span>
                {s.sub && <span className="app-suggest-sub">{s.sub}</span>}
                <span className="app-suggest-kind">{s.kind}</span>
              </button>
            ))}
          </div>
        )}
      </form>

      <div {...rise(3)}>
        <WhatsNew />
      </div>

      <div className="app-tool-grid app-rise" style={{ animationDelay: '280ms' }}>
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Link key={tool.label} to={tool.to} className="app-tool-tile">
              <span className="app-tool-tile-icon">
                <Icon size={20} color="currentColor" />
              </span>
              <span className="app-tool-tile-label">{tool.label}</span>
            </Link>
          )
        })}
      </div>

      {recentItems.length > 0 && (
        <section className="app-section app-rise" style={{ animationDelay: '350ms' }}>
          <div className="app-section-head">
            <h2>Pick up where you left off</h2>
          </div>
          <div className="app-rail">
            {recentItems.map((item) => (
              <Link key={item.id} to={`/design/${item.id}`} className="app-rail-card">
                <Thumb item={item} alt="" />
                <span className="app-rail-title">{item.title}</span>
                <span className="app-rail-sub">{item.creator}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="app-split app-rise" style={{ animationDelay: '420ms' }}>
        <div className="app-split-side">
        <div className="app-panel">
          <div className="app-panel-head">
            <h3>Your plan</h3>
            <Link to={subscription ? '/account' : '/pricing'}>{subscription ? 'Manage' : 'Upgrade'}</Link>
          </div>

          <div className="app-plan-line">
            <span className={`app-plan-chip app-plan-chip-${tier}`}>{plan?.label || 'Free'}</span>
            {subscription ? (
              <span className="app-plan-meta">
                {subscription.billingCycle === 'annual' ? 'Billed annually' : 'Billed monthly'}
                {subscription.currentPeriodEnd
                  ? ` · renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : ''}
              </span>
            ) : (
              <span className="app-plan-meta">Source files locked</span>
            )}
          </div>

          {imageMax > 0 ? (
            <div className="app-meters">
              <div className="app-meter">
                <div className="app-meter-top">
                  <span>AI images</span>
                  <span>{currentUser.credits.image} / {imageMax}</span>
                </div>
                <div className="app-meter-track">
                  <div className="app-meter-fill" style={{ width: `${Math.min(100, (currentUser.credits.image / imageMax) * 100)}%` }} />
                </div>
              </div>
              {videoMax > 0 && (
                <div className="app-meter">
                  <div className="app-meter-top">
                    <span>AI video</span>
                    <span>{currentUser.credits.video}s / {videoMax}s</span>
                  </div>
                  <div className="app-meter-track">
                    <div className="app-meter-fill" style={{ width: `${Math.min(100, (currentUser.credits.video / videoMax) * 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="app-panel-note">
              Subscribe to unlock the source files behind every design, plus the AI Studios.
            </p>
          )}
        </div>

        <div className="app-panel">
          <div className="app-panel-head">
            <h3>Saved</h3>
            <Link to="/collections">All ({currentUser?.savedItemIds.length || 0})</Link>
          </div>
          {savedItems.length > 0 ? (
            <div className="app-saved-strip">
              {savedItems.map((item) => (
                <Link key={item.id} to={`/design/${item.id}`} title={item.title}>
                  <Thumb item={item} alt={item.title} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="app-panel-note">Nothing saved yet. Tap the bookmark on any design to save it.</p>
          )}
        </div>
        </div>

        <div className="app-split-main">
      <section className="app-section">
        <div className="app-section-head">
          <h2>Fresh in the library</h2>
          <Link to="/explore">Browse all <ChevronRightIcon size={13} color="currentColor" /></Link>
        </div>
        <div className="app-rail">
          {freshItems.map((item) => (
            <Link key={item.id} to={`/design/${item.id}`} className="app-rail-card">
              <Thumb item={item} alt="" />
              <span className="app-rail-title">{item.title}</span>
              <span className="app-rail-sub">
                <HeartIcon size={11} color="currentColor" /> {formatCount(item.appreciations)}
                <EyeIcon size={11} color="currentColor" /> {formatCount(item.views)}
              </span>
            </Link>
          ))}
        </div>
      </section>
        </div>
      </div>

      <section className="app-section app-section-wide app-rise" style={{ animationDelay: '490ms' }}>
        <div className="app-section-head">
          <h2>Browse by category</h2>
          <Link to="/categories">See all <ChevronRightIcon size={13} color="currentColor" /></Link>
        </div>
        <div className="app-dept-grid">
          {categoryCounts.map((d) => (
            <Link key={d.id} to={`/explore?category=${d.id}`} className="app-dept-card">
              {d.cover && <img src={d.cover} alt="" />}
              <span className="app-dept-name">{d.label}</span>
              <span className="app-dept-count">{d.count} item{d.count === 1 ? '' : 's'}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Workspaces: the list on the left drives the panel on the right, so
          switching is a single click from the dashboard rather than a trip to
          /workspaces and back. */}
      <section className="app-ws-band app-rise" style={{ animationDelay: '630ms' }}>
        <div className="app-panel app-ws-list">
          <div className="app-panel-head">
            <Link to="/workspaces" className="app-ws-list-title">
              Workspaces <ChevronRightIcon size={13} color="currentColor" />
            </Link>
            <button
              type="button"
              className="app-ws-add"
              onClick={() => setNaming((v) => !v)}
              aria-label="New workspace"
              title="New workspace"
            >
              <PlusIcon size={14} color="currentColor" />
            </button>
          </div>

          <button
            type="button"
            className={!activeTeamId ? 'app-ws-row app-ws-row-active' : 'app-ws-row'}
            onClick={() => setActiveTeam(null)}
          >
            <span className="app-ws-dot" style={{ background: '#f5b53f' }} />
            <span className="app-ws-name">Personal</span>
            <LockIcon size={13} color="currentColor" />
          </button>

          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              className={activeTeamId === team.id ? 'app-ws-row app-ws-row-active' : 'app-ws-row'}
              onClick={() => setActiveTeam(team.id)}
            >
              <span className="app-ws-dot" style={{ background: dotFor(team.id) }} />
              <span className="app-ws-name">{team.name}</span>
              {(team.tier || 'free') === 'free' ? (
                <Link to="/pricing" className="app-ws-upgrade" onClick={(e) => e.stopPropagation()}>
                  Upgrade
                </Link>
              ) : (
                <UsersIcon size={13} color="currentColor" />
              )}
            </button>
          ))}

          {naming && (
            <form className="app-ws-new" onSubmit={handleCreateWorkspace}>
              <input
                type="text"
                autoFocus
                value={wsName}
                placeholder="Workspace name"
                onChange={(e) => setWsName(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setNaming(false)}
              />
              <button type="submit" disabled={!wsName.trim() || creatingWs}>
                {creatingWs ? '…' : 'Create'}
              </button>
            </form>
          )}
          {wsError && <p className="app-ws-error">{wsError}</p>}
        </div>

        <div className="app-panel app-ws-stage">
          {activeTeam ? (
            <>
              <div className="app-ws-stage-head">
                <h3>{activeTeam.name}</h3>
                <span className="app-plan-meta">
                  {TIERS[activeTeam.tier || 'free']?.label || 'Free'} plan ·{' '}
                  {teamMembers.length} member{teamMembers.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="app-avatar-stack">
                {teamMembers.slice(0, 8).map((m) =>
                  m.user?.image ? (
                    <img key={m.id} src={m.user.image} alt={m.user?.name || ''} title={m.user?.name || m.user?.email} />
                  ) : (
                    <span key={m.id} className="app-avatar-stack-fallback" title={m.user?.name || m.user?.email}>
                      {(m.user?.name || m.user?.email || '?').charAt(0).toUpperCase()}
                    </span>
                  )
                )}
                <Link to="/team" className="app-avatar-stack-add" title="Invite someone">
                  <PlusIcon size={13} color="currentColor" />
                </Link>
              </div>
              <div className="app-ws-links">
                <Link to="/collections">Shared collection</Link>
                <Link to="/downloads">Shared downloads</Link>
                <Link to="/team">Manage members</Link>
              </div>
            </>
          ) : (
            <div className="app-ws-empty">
              <SpaceGlyph />
              <h3>Create a workspace</h3>
              <p>
                One plan, one collection and one download history shared across everyone in it.
                You're working solo right now.
              </p>
              <button type="button" className="app-ws-empty-btn" onClick={() => setNaming(true)}>
                New workspace <PlusIcon size={13} color="currentColor" />
              </button>
            </div>
          )}
        </div>
      </section>

      <Link to="/collections" className="app-mywork app-rise" style={{ animationDelay: '700ms' }}>
        My work <ChevronRightIcon size={14} color="currentColor" />
      </Link>

      <div className="app-split app-split-flip app-rise" style={{ animationDelay: '560ms' }}>
      {suggestedCreators.length > 0 && (
        <section className="app-section app-split-main">
          <div className="app-section-head">
            <h2>Creators to follow</h2>
          </div>
          <div className="app-creator-grid">
            {suggestedCreators.map((c) => (
              <div key={c.id} className="app-creator-card">
                <Link to={`/creator/${c.id}`} className="app-creator-id">
                  <img src={c.avatar} alt="" />
                  <span>
                    <strong>{c.name}</strong>
                    <em>{c.specialty} · {c.works} piece{c.works === 1 ? '' : 's'}</em>
                  </span>
                </Link>
                <button type="button" className="app-follow-btn" onClick={() => toggleFollow(c.id)}>
                  Follow
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="app-panel app-cta-panel app-split-side">
        <div className="app-panel-head">
          <h3>{currentUser?.isCreator ? 'Your earnings' : 'Sell your work'}</h3>
        </div>
        <p className="app-cta-desc">
          {currentUser?.isCreator
            ? `$${(currentUser.earningsThisMonth || 0).toFixed(2)} this month · $${(currentUser.allTimeEarnings || 0).toFixed(2)} all time. Half of every subscription dollar is pooled and split across creators each month.`
            : 'Upload finished designs and videos you never got to use. When subscribers download them, you get paid every month, and you keep all your rights.'}
        </p>
        <Link to={currentUser?.isCreator ? '/dashboard' : '/become-creator'} className="app-cta-btn">
          {currentUser?.isCreator ? 'Open dashboard' : 'Become a Creator'}
        </Link>
      </div>
      </div>
    </div>
  )
}
