import { useMemo } from 'react'
import { fontStack } from '../lib/fonts'

function Mark({ svg, className = '' }) {
  return <div className={`sk-mark ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />
}

/**
 * A matching business card (front and back), letterhead and envelope — the
 * same pack, palette and typeface as the brand guide, laid out at true
 * physical size and printed at that size (CSS named @page rules, one per
 * item), not scaled to fit an A4 sheet. window.print() again: no PDF
 * library, no server round trip.
 */
export default function StationeryKit({ pack, name, tagline, palette, font, contact }) {
  const byId = useMemo(() => Object.fromEntries(pack.map((a) => [a.id, a])), [pack])
  const family = fontStack(font)
  const label = name || 'Your Brand'
  const ink = palette[0]
  const accent = palette[1]
  const paper = palette[palette.length - 1]
  const vars = { '--sk-ink': ink, '--sk-accent': accent, '--sk-paper': paper, '--sk-font': family }

  const person = contact.person || 'Your name'
  const title = contact.title || 'Title'
  const lines = [contact.phone, contact.email, contact.website].filter(Boolean)

  return (
    <div className="sk-wrap" style={vars}>
      <div className="sk-row">
        <figure className="sk-item">
          <div className="sk-card sk-page-card">
            <div className="sk-card-mark">{byId.mark && <Mark svg={byId.mark.svg} />}</div>
            <div className="sk-card-text">
              <strong style={{ fontFamily: family }}>{person}</strong>
              <span>{title}</span>
            </div>
          </div>
          <figcaption>Business card — front</figcaption>
        </figure>

        <figure className="sk-item">
          <div className="sk-card sk-card-back sk-page-card">
            <div className="sk-card-back-mark">{byId.mark && <Mark svg={byId.mark.svg} />}</div>
            <div className="sk-card-back-name" style={{ fontFamily: family }}>{label}</div>
            <div className="sk-card-back-contact">
              {lines.length ? lines.map((l) => <span key={l}>{l}</span>) : <span>Add contact details below</span>}
            </div>
          </div>
          <figcaption>Business card — back</figcaption>
        </figure>
      </div>

      <div className="sk-row">
        <figure className="sk-item">
          <div className="sk-letter sk-page-letter">
            <div className="sk-letter-head">
              {byId.primary ? <Mark svg={byId.primary.svg} className="sk-letter-logo" /> : <strong style={{ fontFamily: family }}>{label}</strong>}
            </div>
            <div className="sk-letter-rule" />
            <div className="sk-letter-body" />
            <div className="sk-letter-foot">
              {contact.address && <span>{contact.address}</span>}
              {lines.length > 0 && <span>{lines.join('  ·  ')}</span>}
            </div>
          </div>
          <figcaption>Letterhead</figcaption>
        </figure>

        <figure className="sk-item">
          <div className="sk-envelope sk-page-envelope">
            <div className="sk-envelope-return">
              {byId.secondary ? <Mark svg={byId.secondary.svg} /> : <strong style={{ fontFamily: family }}>{label}</strong>}
              {contact.address && <span>{contact.address}</span>}
            </div>
          </div>
          <figcaption>Envelope</figcaption>
        </figure>
      </div>
    </div>
  )
}
