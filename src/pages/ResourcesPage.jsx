import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
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
      { to: '/help', label: 'Help centre', desc: 'Answers to the questions people actually ask.', icon: HelpIcon },
      { to: '/departments', label: 'The five departments', desc: 'How the library is organised and what belongs where.', icon: FolderIcon },
      { to: '/pricing', label: 'Plans & what each unlocks', desc: 'Free, Standard and Express side by side.', icon: CardIcon },
    ],
  },
  {
    title: 'For creators',
    items: [
      { to: '/become-creator', label: 'Become a Creator', desc: 'Upload guidelines, the payout split, and the rights you keep.', icon: UploadIcon, hideWhenCreator: true },
      { to: '/upload', label: 'Upload work', desc: 'Submit a finished piece with its real source files.', icon: UploadIcon, creatorOnly: true },
      { to: '/projects', label: 'Your projects', desc: 'What you have live, and what is still in review.', icon: PenIcon, creatorOnly: true },
      { to: '/dashboard', label: 'Earnings & referrals', desc: 'Your share of the monthly pool, and your referral link.', icon: ChartIcon, creatorOnly: true },
    ],
  },
  {
    title: 'Working together',
    items: [
      { to: '/workspaces', label: 'Workspaces', desc: 'Share a plan, collections and downloads with your team.', icon: UsersIcon },
      { to: '/team', label: 'Team members & roles', desc: 'Invite people, set roles, manage the shared plan.', icon: UsersIcon },
      { to: '/studio/image', label: 'AI Studio', desc: 'Generate images and video from inside your plan.', icon: SparkleIcon },
    ],
  },
  {
    title: 'About Routicle',
    items: [
      { to: '/about', label: 'About', desc: 'Why this exists and who it is for.', icon: StarIcon },
      { to: '/blog', label: 'Blog', desc: 'Product notes and creator features.', icon: PenIcon },
      { to: '/brand', label: 'Brand assets', desc: 'Logo, colours and how to refer to us.', icon: StarIcon },
      { to: '/careers', label: 'Careers', desc: 'Open roles.', icon: UsersIcon },
      { to: '/contact', label: 'Contact', desc: 'Reach a human.', icon: HelpIcon },
    ],
  },
  {
    title: 'Legal',
    items: [
      { to: '/terms', label: 'Terms of Service', desc: 'The agreement covering use of the platform.', icon: FolderIcon },
      { to: '/privacy', label: 'Privacy Policy', desc: 'What we store, and what we do with it.', icon: FolderIcon },
    ],
  },
]

export default function ResourcesPage() {
  const { currentUser } = useApp()
  const isCreator = !!currentUser?.isCreator

  return (
    <div className="explore-page">
      <h1 className="deck-heading">Resources</h1>
      <div className="deck-accent" aria-hidden="true" />
      <p className="explore-count" style={{ marginTop: 18 }}>
        How Routicle works, what you can do with what you download, and where everything lives.
      </p>

      {GROUPS.map((group) => {
        const items = group.items.filter(
          (item) => (!item.creatorOnly || isCreator) && (!item.hideWhenCreator || !isCreator)
        )
        if (items.length === 0) return null
        return (
          <section key={group.title} className="resource-group">
            <h2 className="project-group-title">{group.title}</h2>
            <div className="resource-grid">
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.to} to={item.to} className="resource-card">
                    <span className="resource-card-icon">
                      <Icon size={17} color="currentColor" />
                    </span>
                    <span className="resource-card-label">{item.label}</span>
                    <span className="resource-card-desc">{item.desc}</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
