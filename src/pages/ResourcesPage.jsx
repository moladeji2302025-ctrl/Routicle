import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { fetchPublicResources } from '../lib/api'
import {
  HelpIcon,
  UploadIcon,
  CardIcon,
  UsersIcon,
  SparkleIcon,
  FolderIcon,
  StarIcon,
  PenIcon,
  ChartIcon,
} from '../components/icons'

/**
 * A hub for everything that isn't browsing: how the platform works, what the
 * rules are, and where the legal pages live. Every entry points at a route
 * that already exists — nothing here is a placeholder.
 */
const GROUPS = [
  {
    title: 'Getting started',
    items: [
      { to: '/help', label: 'Help centre', desc: 'Answers to the questions people actually ask.', icon: HelpIcon, more: { blurb: "Search by keyword, or browse by the part of the app you're stuck in.", points: ["Downloads and file formats", "Billing and cancellations", "Why a submission was rejected"] } },
      { to: '/departments', label: 'The five departments', desc: 'How the library is organised and what belongs where.', icon: FolderIcon, more: { blurb: "Five departments, each with its own sub-departments. Where a piece sits decides who finds it.", points: ["Graphic Design \u00b7 Motion \u00b7 Illustration", "AI-Generated Images and Video", "Sub-departments narrow it further"] } },
      { to: '/pricing', label: 'Plans & what each unlocks', desc: 'Free, Standard and Express side by side.', icon: CardIcon, more: { blurb: "Browsing is free forever. A plan is what unlocks the editable files and the Studios.", points: ["Standard \u2014 PSD, AI and Canva files", "Express \u2014 adds After Effects and Premiere", "Annual billing saves 25%"] } },
    ],
  },
  {
    title: 'For creators',
    items: [
      { to: '/become-creator', label: 'Become a Creator', desc: 'Upload guidelines, the payout split, and the rights you keep.', icon: UploadIcon, hideWhenCreator: true, more: { blurb: "You keep the copyright. Routicle only gets a non-exclusive licence to distribute the files.", points: ["Half of subscription revenue is pooled", "Paid out monthly, pro rata by downloads", "Upload work you already finished"] } },
      { to: '/upload', label: 'Upload work', desc: 'Submit a finished piece with its real source files.', icon: UploadIcon, creatorOnly: true, more: { blurb: "A submission needs the real working file, not just an export.", points: ["Thumbnail plus an optional MP4 preview", "Department and sub-department", "An optional Behind the Design note"] } },
      { to: '/projects', label: 'Your projects', desc: 'What you have live, and what is still in review.', icon: PenIcon, creatorOnly: true, more: { blurb: "Everything you've submitted, in one list, with its current moderation state.", points: ["Live, in review, or needs changes", "Per-piece download counts", "Edit and resubmit in place"] } },
      { to: '/dashboard', label: 'Earnings & referrals', desc: 'Your share of the monthly pool, and your referral link.', icon: ChartIcon, creatorOnly: true, more: { blurb: "Your own numbers only \u2014 never platform-wide totals.", points: ["This month's share of the pool", "All-time earnings and payout history", "Your referral link and its count"] } },
    ],
  },
  {
    title: 'Working together',
    items: [
      { to: '/workspaces', label: 'Workspaces', desc: 'Share a plan, collections and downloads with your team.', icon: UsersIcon, more: { blurb: "A workspace owns its own plan, collections and download history.", points: ["Switching changes what you see everywhere", "One bill covers every member", "Personal stays separate from team"] } },
      { to: '/team', label: 'Team members & roles', desc: 'Invite people, set roles, manage the shared plan.', icon: UsersIcon, more: { blurb: "Owners can invite, remove and set roles; members can't.", points: ["Invites go out by email", "Owner, admin and member roles", "Only the owner can delete a workspace"] } },
      { to: '/studio/image', label: 'AI Studio', desc: 'Generate images and video from inside your plan.', icon: SparkleIcon, more: { blurb: "Generations come out of your plan's monthly allowance, not a separate wallet.", points: ["Standard \u2014 50 images a month", "Express \u2014 adds 60s of AI video", "Upscaling included on both"] } },
    ],
  },
  {
    title: 'About Routicle',
    items: [
      { to: '/about', label: 'About', desc: 'Why this exists and who it is for.', icon: StarIcon, more: { blurb: "Why finished-but-unused work is worth publishing at all.", points: ["Where the idea came from", "Who it's built for", "How creators actually get paid"] } },
      { to: '/blog', label: 'Blog', desc: 'Product notes and creator features.', icon: PenIcon, more: { blurb: "Release notes and the people behind the work in the library.", points: ["What shipped, and when", "Creator features", "How the pool performed"] } },
      { to: '/brand', label: 'Brand assets', desc: 'Logo, colours and how to refer to us.', icon: StarIcon, more: { blurb: "Everything you need to refer to Routicle correctly.", points: ["Logo files, light and dark", "Colour values", "Naming and spelling"] } },
      { to: '/careers', label: 'Careers', desc: 'Open roles.', icon: UsersIcon, more: { blurb: "Small team. Roles open when we genuinely need them.", points: ["What we're hiring for now", "How the process runs"] } },
      { to: '/contact', label: 'Contact', desc: 'Reach a human.', icon: HelpIcon, more: { blurb: "A real inbox, not a ticket maze.", points: ["Support and account questions", "Press and partnerships", "Rights and takedowns"] } },
    ],
  },
  {
    title: 'Legal',
    items: [
      { to: '/terms', label: 'Terms of Service', desc: 'The agreement covering use of the platform.', icon: FolderIcon, more: { blurb: "The agreement that covers downloading, using and publishing the files.", points: ["What a licence lets you do", "What it doesn't", "Account termination"] } },
      { to: '/privacy', label: 'Privacy Policy', desc: 'What we store, and what we do with it.', icon: FolderIcon, more: { blurb: "What is stored, why, and how to get it removed.", points: ["Data we hold", "Processors we use", "Deleting your account"] } },
    ],
  },
]

export default function ResourcesPage() {
  const { currentUser } = useApp()
  const isCreator = !!currentUser?.isCreator
  const [added, setAdded] = useState([])

  // The hover panel: one at a time across the whole page, so `panel` carries
  // the group it belongs to as well as where inside that grid it sits.
  const gridRefs = useRef({})
  const timerRef = useRef(null)
  const [panel, setPanel] = useState(null)
  const [shown, setShown] = useState(false)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  /**
   * Measures the hovered card's row and parks the panel in whatever space is
   * left beside the last card on it.
   *
   * The row is found by offsetTop rather than by arithmetic on a column count:
   * the grid is `auto-fill`, so how many cards share a line changes with the
   * viewport, and measuring asks the browser instead of guessing.
   */
  function armPanel(event, item, groupTitle) {
    const card = event.currentTarget
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const grid = gridRefs.current[groupTitle]
      if (!grid) return
      const row = Array.from(grid.querySelectorAll('.resource-card')).filter(
        (el) => Math.abs(el.offsetTop - card.offsetTop) < 4
      )
      const last = row[row.length - 1]
      const left = last.offsetLeft + last.offsetWidth + 12
      const free = grid.clientWidth - left
      // A full row leaves nothing to slide into, so the panel floats over the
      // end of it instead of shoving the cards below onto a new line.
      const overlay = free < 210
      setPanel({
        group: groupTitle,
        item,
        top: card.offsetTop,
        height: card.offsetHeight,
        left: overlay ? Math.max(0, grid.clientWidth - 300) : left,
        width: overlay ? 300 : free,
        overlay,
      })
      requestAnimationFrame(() => setShown(true))
    }, 1500)
  }

  function disarmPanel() {
    clearTimeout(timerRef.current)
    setShown(false)
  }

  // Admin-added entries are merged into the matching built-in group, or appear
  // as their own group if an admin used a name that isn't one of these.
  useEffect(() => {
    let cancelled = false
    fetchPublicResources()
      .then(({ resources }) => !cancelled && setAdded(resources))
      .catch(() => {
        // API unreachable — the built-in groups below still render.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const groupNames = GROUPS.map((g) => g.title)
  const extraGroups = [...new Set(added.map((r) => r.group))].filter((g) => !groupNames.includes(g))

  const merged = [
    ...GROUPS.map((group) => ({
      ...group,
      items: [
        ...group.items,
        ...added
          .filter((r) => r.group === group.title)
          .map((r) => ({ to: r.url, label: r.title, desc: r.description || '', icon: StarIcon })),
      ],
    })),
    ...extraGroups.map((name) => ({
      title: name,
      items: added
        .filter((r) => r.group === name)
        .map((r) => ({ to: r.url, label: r.title, desc: r.description || '', icon: StarIcon })),
    })),
  ]

  return (
    <div className="explore-page">
      <h1 className="deck-heading">Resources</h1>
      <div className="deck-accent" aria-hidden="true" />
      <p className="explore-count" style={{ marginTop: 18 }}>
        How Routicle works, what you can do with what you download, and where everything lives.
      </p>

      {merged.map((group) => {
        const items = group.items.filter(
          (item) => (!item.creatorOnly || isCreator) && (!item.hideWhenCreator || !isCreator)
        )
        if (items.length === 0) return null
        return (
          <section key={group.title} className="resource-group">
            <h2 className="project-group-title">{group.title}</h2>
            <div
              className="resource-grid"
              ref={(el) => {
                gridRefs.current[group.title] = el
              }}
            >
              {items.map((item) => {
                const Icon = item.icon
                // Admin-added links can point off-site; those need a real anchor.
                const external = /^https?:\/\//i.test(item.to)
                const inner = (
                  <>
                    <span className="resource-card-icon">
                      <Icon size={17} color="currentColor" />
                    </span>
                    <span className="resource-card-label">{item.label}</span>
                    {item.desc && <span className="resource-card-desc">{item.desc}</span>}
                  </>
                )
                const hoverProps = {
                  onMouseEnter: (e) => armPanel(e, item, group.title),
                  onMouseLeave: disarmPanel,
                  onBlur: disarmPanel,
                }
                return external ? (
                  <a
                    key={item.to}
                    href={item.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resource-card"
                    {...hoverProps}
                  >
                    {inner}
                  </a>
                ) : (
                  <Link key={item.to} to={item.to} className="resource-card" {...hoverProps}>
                    {inner}
                  </Link>
                )
              })}

              {panel?.group === group.title && (
                <aside
                  className={[
                    'resource-peek',
                    shown ? 'resource-peek-in' : '',
                    panel.overlay ? 'resource-peek-float' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    top: panel.top,
                    left: panel.left,
                    width: panel.width,
                    minHeight: panel.height,
                  }}
                  aria-hidden="true"
                >
                  <p className="resource-peek-title">{panel.item.label}</p>
                  <p className="resource-peek-blurb">
                    {panel.item.more?.blurb || panel.item.desc}
                  </p>
                  {panel.item.more?.points && (
                    <ul className="resource-peek-points">
                      {panel.item.more.points.map((pt, i) => (
                        <li key={pt} style={{ transitionDelay: `${90 + i * 55}ms` }}>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  )}
                </aside>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
