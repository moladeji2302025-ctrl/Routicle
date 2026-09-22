import { useMemo } from 'react'
import { DOCUMENT_STYLES } from '../../data/documentStyles'
import DocumentRenderer from './DocumentRenderer'

const STYLE_KEY = 'routicle.doc-style'

/**
 * The style picked last time for this kind of document, so the next one
 * starts in the same look. Kept per kind: an invoice-only style like Ledger
 * remembered as "last used" must never become the default for a new proposal.
 */
export function rememberedStyle(kind) {
  try {
    const stored = JSON.parse(localStorage.getItem(STYLE_KEY) || '{}')
    const id = stored[kind]
    const style = id && DOCUMENT_STYLES.find((s) => s.id === id)
    if (style && (!style.kinds || style.kinds.includes(kind))) return id
  } catch {
    // storage blocked or unreadable: fall through to the default
  }
  return 'branded'
}

export function rememberStyle(kind, id) {
  try {
    const stored = JSON.parse(localStorage.getItem(STYLE_KEY) || '{}')
    localStorage.setItem(STYLE_KEY, JSON.stringify({ ...stored, [kind]: id }))
  } catch {
    // storage blocked: the choice just isn't remembered
  }
}

/**
 * A grid of real covers, one per style, drawn by the same renderer as the
 * document itself with the subscriber's own studio and client names in them.
 * What you pick is what you get.
 */
export default function StylePicker({ doc, value, onChange, accent, compact = false }) {
  const previews = useMemo(
    () =>
      DOCUMENT_STYLES.filter((s) => !s.kinds || s.kinds.includes(doc.kind)).map((s) => ({
        style: s,
        doc: { ...doc, style: s.id, accent: accent || null },
      })),
    [doc, accent]
  )
  return (
    <div className={compact ? 'doc-styles doc-styles-compact' : 'doc-styles'} role="radiogroup" aria-label="Document style">
      {previews.map(({ style, doc: d }) => (
        <button
          key={style.id}
          type="button"
          role="radio"
          aria-checked={value === style.id}
          className={value === style.id ? 'doc-style doc-style-on' : 'doc-style'}
          onClick={() => {
            rememberStyle(doc.kind, style.id)
            onChange(style.id)
          }}
        >
          <span className="doc-style-thumb" aria-hidden="true">
            <DocumentRenderer doc={d} mode="cover" />
          </span>
          <span className="doc-style-name">{style.name}</span>
          {!compact && <span className="doc-style-blurb">{style.blurb}</span>}
        </button>
      ))}
    </div>
  )
}
