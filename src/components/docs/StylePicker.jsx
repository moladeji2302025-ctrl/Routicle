import { useMemo } from 'react'
import { DOCUMENT_STYLES } from '../../data/documentStyles'
import DocumentRenderer from './DocumentRenderer'

const STYLE_KEY = 'routicle.doc-style'

/** The style picked last time, so the next document starts in the same look. */
export function rememberedStyle() {
  try {
    return localStorage.getItem(STYLE_KEY) || 'branded'
  } catch {
    return 'branded'
  }
}

export function rememberStyle(id) {
  try {
    localStorage.setItem(STYLE_KEY, id)
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
    () => DOCUMENT_STYLES.map((s) => ({ style: s, doc: { ...doc, style: s.id, accent: accent || null } })),
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
            rememberStyle(style.id)
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
