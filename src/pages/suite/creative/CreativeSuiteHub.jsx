import { Link } from 'react-router-dom'
import { useCreativeDraft } from '../../../lib/creativeDraft'
import { PenIcon, SlidersIcon, BookmarkIcon, CardIcon, GridIcon, ChevronRightIcon } from '../../../components/icons'

export default function CreativeSuiteHub() {
  const [draft] = useCreativeDraft()
  const hasMark = Boolean(draft.trace)

  const TOOLS = [
    {
      to: '/suite/creative/logo',
      icon: PenIcon,
      label: 'Logo Maker',
      blurb: 'Upload a sketch or a flat logo. Trace it, build the full pack — mark, wordmark, lockups.',
    },
    {
      to: '/suite/creative/palette',
      icon: SlidersIcon,
      label: 'Palette Lab',
      blurb: 'A preset, real colour theory from one seed colour, or the dominant tones pulled from a photo.',
    },
    {
      to: '/suite/creative/brand-guide',
      icon: BookmarkIcon,
      label: 'Brand Guide',
      blurb: 'A printable style guide, generated from the pack — usage, palette, type, misuse examples.',
      needsMark: true,
    },
    {
      to: '/suite/creative/stationery',
      icon: CardIcon,
      label: 'Stationery',
      blurb: 'A matching business card, letterhead and envelope, printed at true size.',
      needsMark: true,
    },
    {
      to: '/suite/creative/templates',
      icon: GridIcon,
      label: 'Featured Templates',
      blurb: "Drop the brand into a creator's frame — social posts, decks, one-pagers.",
      needsMark: true,
    },
  ]

  return (
    <>
      <div className="suite-section-head">
        <div>
          <h2>Creative Suite</h2>
          <p className="settings-section-desc">
            Five tools, one brand. Build the mark once in Logo Maker — everything else here is generated from it.
          </p>
        </div>
      </div>

      {hasMark && (
        <div className="cs-hub-draft">
          <div className="cs-hub-draft-mark" dangerouslySetInnerHTML={{ __html: draft.trace ? markPreview(draft) : '' }} />
          <div>
            <strong>{draft.name || 'Untitled brand'}</strong>
            <span>Continue where you left off, or start a new mark in Logo Maker.</span>
          </div>
        </div>
      )}

      <nav className="suite-tabs cs-hub-grid">
        {TOOLS.map((t) => {
          const Icon = t.icon
          const locked = t.needsMark && !hasMark
          return (
            <Link key={t.to} to={locked ? '/suite/creative/logo' : t.to} className={locked ? 'suite-tab cs-hub-tab-locked' : 'suite-tab'}>
              <Icon size={17} color="currentColor" />
              <span>
                <strong>
                  {t.label}
                  {locked && <em className="cs-hub-lock">Build a mark first</em>}
                </strong>
                <em>{t.blurb}</em>
              </span>
              <span className="cs-hub-chevron"><ChevronRightIcon size={14} color="currentColor" /></span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

function markPreview({ trace }) {
  const [, , vw, vh] = trace.viewBox.split(/\s+/).map(Number)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}"><path d="${trace.pathData}" fill="currentColor" fill-rule="evenodd"/></svg>`
}
