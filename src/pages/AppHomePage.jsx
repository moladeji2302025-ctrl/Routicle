import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { DEPARTMENTS, departmentLabel } from '../data/departments'
import { CREATORS, getCreatorByName } from '../data/creators'
import { TIERS } from '../data/pricing'
import { formatCount } from '../utils/format'
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
} from '../components/icons'

const BANNER_KEY = 'routicle_home_banner_dismissed'

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
    pendingSubmissions,
    toggleFollow,
  } = useApp()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [openSuggestions, setOpenSuggestions] = useState(false)
  const [cursor, setCursor] = useState(0)
  const searchRef = useRef(null)
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return localStorage.getItem(BANNER_KEY) === '1'
    } catch {
      return false
    }
  })

  const approved = useMemo(
    () => contentItems.filter((item) => item.moderationStatus === 'approved'),
    [contentItems]
  )

  /* ---- Command bar: real matches across designs, creators and departments ---- */
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out = []

    DEPARTMENTS.filter((d) => d.label.toLowerCase().includes(q))
      .slice(0, 2)
      .forEach((d) => out.push({ kind: 'Department', label: d.label, to: `/explore?department=${d.id}` }))

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

  const departmentCounts = useMemo(
    () =>
      DEPARTMENTS.map((d) => ({
        ...d,
        count: approved.filter((i) => i.department === d.id).length,
        cover: approved.find((i) => i.department === d.id)?.image,
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

  const myPending = useMemo(
    () => (currentUser?.isCreator ? pendingSubmissions.filter((s) => s.creatorName === currentUser.name) : []),
    [pendingSubmissions, currentUser]
  )

  const tier = subscription?.tier || 'free'
  const plan = TIERS[tier]
  const imageMax = plan?.imageCredits || 0
  const videoMax = plan?.videoCredits || 0

  const tools = [
    { label: 'Explore', to: '/explore', icon: GridIcon },
    { label: 'Departments', to: '/departments', icon: FolderIcon },
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
  ]

  function dismissBanner() {
    setBannerDismissed(true)
    try {
      localStorage.setItem(BANNER_KEY, '1')
    } catch {
      // ignore
    }
  }

  // The banner only appears when it has something real to say — it's driven by
  // actual state (queue depth, plan, creator status), never shown just to fill space.
  const banner = !bannerDismissed
    ? currentUser?.isAdmin && pendingSubmissions.length > 0
      ? {
          tag: 'Moderation',
          text: `${pendingSubmissions.length} submission${pendingSubmissions.length === 1 ? '' : 's'} waiting for review.`,
          cta: { label: 'Review queue', to: '/admin' },
        }
      : myPending.length > 0
        ? {
            tag: 'In review',
            text: `${myPending.length} of your upload${myPending.length === 1 ? ' is' : 's are'} being checked before going live.`,
            cta: { label: 'View dashboard', to: '/dashboard' },
          }
        : tier === 'free'
          ? {
              tag: 'Free plan',
              text: 'You can browse everything, but source files stay locked until you subscribe.',
              cta: { label: 'See plans', to: '/pricing' },
            }
          : !currentUser?.isCreator
            ? {
                tag: 'Earn',
                text: 'Sitting on finished work you never used? Upload it and take a share of the pool.',
                cta: { label: 'Become a Creator', to: '/become-creator' },
              }
            : null
    : null

  return (
    <div className="app-home">
      {banner && (
        <div className="app-banner">
          <span className="app-banner-tag">{banner.tag}</span>
          <span className="app-banner-text">{banner.text}</span>
          <Link to={banner.cta.to} className="app-banner-cta">{banner.cta.label}</Link>
          <button type="button" className="app-banner-close" onClick={dismissBanner} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <h1 className="app-home-greeting">
        {greeting()}, {currentUser?.name?.split(' ')[0] || 'there'}
      </h1>
      <p className="app-home-sub">
        {approved.length} finished piece{approved.length === 1 ? '' : 's'} in the library right now
        {activeTeam ? ` · working in ${activeTeam.name}` : ''}
      </p>

      <form className="app-home-search" onSubmit={handleSearchSubmit} role="search">
        <SearchIcon size={16} color="currentColor" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search designs, creators or departments…"
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

      <div className="app-tool-grid">
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
        <section className="app-section">
          <div className="app-section-head">
            <h2>Pick up where you left off</h2>
          </div>
          <div className="app-rail">
            {recentItems.map((item) => (
              <Link key={item.id} to={`/design/${item.id}`} className="app-rail-card">
                <img src={item.image} alt="" />
                <span className="app-rail-title">{item.title}</span>
                <span className="app-rail-sub">{item.creator}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="app-panel-row">
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
            <h3>Workspace</h3>
            <Link to="/team">{teams.length > 0 ? 'Manage' : 'Create'}</Link>
          </div>

          {activeTeam ? (
            <>
              <div className="app-plan-line">
                <span className="app-plan-chip app-plan-chip-team">{activeTeam.name}</span>
                <span className="app-plan-meta">
                  {teamMembers.length} member{teamMembers.length === 1 ? '' : 's'} · shared collections
                </span>
              </div>
              <div className="app-avatar-stack">
                {teamMembers.slice(0, 6).map((m) =>
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
            </>
          ) : (
            <p className="app-panel-note">
              You're working solo. A team shares one plan, one collection, and one download history
              across everyone in it.
            </p>
          )}

          <div className="app-panel-head app-panel-head-tight">
            <h3>Saved</h3>
            <Link to="/collections">All ({currentUser?.savedItemIds.length || 0})</Link>
          </div>
          {savedItems.length > 0 ? (
            <div className="app-saved-strip">
              {savedItems.map((item) => (
                <Link key={item.id} to={`/design/${item.id}`} title={item.title}>
                  <img src={item.image} alt={item.title} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="app-panel-note">Nothing saved yet — tap the bookmark on any design.</p>
          )}
        </div>
      </div>

      <section className="app-section">
        <div className="app-section-head">
          <h2>Fresh in the library</h2>
          <Link to="/explore">Browse all <ChevronRightIcon size={13} color="currentColor" /></Link>
        </div>
        <div className="app-rail">
          {freshItems.map((item) => (
            <Link key={item.id} to={`/design/${item.id}`} className="app-rail-card">
              <img src={item.image} alt="" />
              <span className="app-rail-title">{item.title}</span>
              <span className="app-rail-sub">
                <HeartIcon size={11} color="currentColor" /> {formatCount(item.appreciations)}
                <EyeIcon size={11} color="currentColor" /> {formatCount(item.views)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="app-section">
        <div className="app-section-head">
          <h2>Browse by department</h2>
          <Link to="/departments">See all <ChevronRightIcon size={13} color="currentColor" /></Link>
        </div>
        <div className="app-dept-grid">
          {departmentCounts.map((d) => (
            <Link key={d.id} to={`/explore?department=${d.id}`} className="app-dept-card">
              {d.cover && <img src={d.cover} alt="" />}
              <span className="app-dept-name">{d.label}</span>
              <span className="app-dept-count">{d.count} item{d.count === 1 ? '' : 's'}</span>
            </Link>
          ))}
        </div>
      </section>

      {suggestedCreators.length > 0 && (
        <section className="app-section">
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

      <div className="app-panel app-cta-panel app-cta-wide">
        <div className="app-panel-head">
          <h3>{currentUser?.isCreator ? 'Your earnings' : 'Sell your work'}</h3>
        </div>
        <p className="app-cta-desc">
          {currentUser?.isCreator
            ? `$${(currentUser.earningsThisMonth || 0).toFixed(2)} this month · $${(currentUser.allTimeEarnings || 0).toFixed(2)} all time. Half of every subscription dollar is pooled and split across creators each month.`
            : 'Upload finished designs and video you never got to use. Subscribers download the files, you get paid every month — non-exclusive, no strings attached.'}
        </p>
        <Link to={currentUser?.isCreator ? '/dashboard' : '/become-creator'} className="app-cta-btn">
          {currentUser?.isCreator ? 'Open dashboard' : 'Become a Creator'}
        </Link>
      </div>
    </div>
  )
}
