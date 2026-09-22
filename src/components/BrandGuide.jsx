import { useEffect, useMemo } from 'react'
import { ensureFont, fontStack } from '../lib/fonts'
import { isDark } from '../lib/logoPack'
import { hexToRgb, rgbToHsl } from '../lib/colorTools'

const ROLE_LABEL = ['Ink', 'Accent', 'Soft', 'Paper']

function fmtRgb({ r, g, b }) {
  return `RGB ${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`
}

function fmtHsl(hex) {
  const { h, s, l } = rgbToHsl(hexToRgb(hex))
  return `HSL ${Math.round(h)}°, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`
}

function Mark({ svg, className = '' }) {
  return <div className={`bg-mark ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />
}

/**
 * A real, printable brand guide, generated from the pack a subscriber just
 * built — nothing here is invented or asked for twice. It's pages sized and
 * printed exactly like the Business Suite's documents (window.print(), the
 * same @page rule), so "Print / PDF" produces a genuine multi-page PDF with
 * no server round trip and no new dependency.
 */
export default function BrandGuide({ pack, name, tagline, palette, font }) {
  const byId = useMemo(() => Object.fromEntries(pack.map((a) => [a.id, a])), [pack])
  const label = name || 'Your Brand'
  const family = fontStack(font)
  const ink = palette[0]
  const paper = palette[palette.length - 1]

  useEffect(() => {
    ensureFont(font, { weights: [300, 400, 600, 700, 900] })
  }, [font])

  return (
    <div className="bg-doc" style={{ '--bg-ink': ink, '--bg-paper': paper, '--bg-accent': palette[1], '--bg-font': family }}>
      {/* ---------------------------------------------------------- cover */}
      <section className="bg-page bg-cover">
        <span className="bg-kicker">Brand Guidelines</span>
        <h1 style={{ fontFamily: family }}>{label}</h1>
        {tagline && <p className="bg-cover-tagline">{tagline}</p>}
        <div className="bg-cover-swatches">
          {palette.map((c) => (
            <span key={c} style={{ background: c }} />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- logo */}
      <section className="bg-page">
        <h2 style={{ fontFamily: family }}>The logo</h2>
        <p className="bg-lede">Three lockups, for three different jobs. Use whichever fits the space — never redraw or approximate any of them.</p>
        <div className="bg-logo-grid">
          {byId.primary && (
            <div className="bg-logo-cell bg-logo-cell-wide">
              <Mark svg={byId.primary.svg} />
              <span>Primary — the everyday lockup</span>
            </div>
          )}
          {byId.secondary && (
            <div className="bg-logo-cell">
              <Mark svg={byId.secondary.svg} />
              <span>Secondary — square and narrow spaces</span>
            </div>
          )}
          {byId.mark && (
            <div className="bg-logo-cell">
              <Mark svg={byId.mark.svg} />
              <span>Mark alone — once the brand is established</span>
            </div>
          )}
        </div>
      </section>

      {/* --------------------------------------------- clear space & size */}
      <section className="bg-page">
        <h2 style={{ fontFamily: family }}>Clear space &amp; minimum size</h2>
        <p className="bg-lede">Keep at least this much open space around the mark — nothing else, no text, no edge, inside that margin.</p>
        <div className="bg-clearspace">
          <div className="bg-clearspace-ring">
            {byId.mark && <Mark svg={byId.mark.svg} />}
          </div>
        </div>
        <div className="bg-minsize">
          <div className="bg-minsize-cell">
            {byId.mark && <Mark svg={byId.mark.svg} className="bg-mark-small" />}
            <span>24px minimum, digital</span>
          </div>
          <div className="bg-minsize-cell">
            {byId.mark && <Mark svg={byId.mark.svg} className="bg-mark-tiny" />}
            <span>10mm minimum, print</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- palette */}
      <section className="bg-page">
        <h2 style={{ fontFamily: family }}>Colour palette</h2>
        <p className="bg-lede">Four colours, one job each. Ink and paper carry the text; accent and soft are for emphasis, never for body copy on paper.</p>
        <div className="bg-swatch-list">
          {palette.map((c, i) => (
            <div key={c} className="bg-swatch-row" style={{ background: c, color: isDark(c) ? '#fff' : '#16161a' }}>
              <span className="bg-swatch-role">{ROLE_LABEL[i] || `Colour ${i + 1}`}</span>
              <span className="bg-swatch-hex">{c.toUpperCase()}</span>
              <span className="bg-swatch-fmt">{fmtRgb(hexToRgb(c))}</span>
              <span className="bg-swatch-fmt">{fmtHsl(c)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- typography */}
      <section className="bg-page">
        <h2 style={{ fontFamily: family }}>Typography</h2>
        <p className="bg-lede">{font} carries the whole brand — headings and body both. One typeface, used with intent, reads as more considered than two used carelessly.</p>
        <div className="bg-type-scale">
          <div className="bg-type-row">
            <span className="bg-type-label">Display · 700</span>
            <span className="bg-type-sample" style={{ fontFamily: family, fontWeight: 700, fontSize: 54 }}>{label}</span>
          </div>
          <div className="bg-type-row">
            <span className="bg-type-label">Heading · 600</span>
            <span className="bg-type-sample" style={{ fontFamily: family, fontWeight: 600, fontSize: 30 }}>The quick brown fox</span>
          </div>
          <div className="bg-type-row">
            <span className="bg-type-label">Body · 400</span>
            <span className="bg-type-sample" style={{ fontFamily: family, fontWeight: 400, fontSize: 17 }}>The quick brown fox jumps over the lazy dog.</span>
          </div>
          <div className="bg-type-row">
            <span className="bg-type-label">Small · 400</span>
            <span className="bg-type-sample" style={{ fontFamily: family, fontWeight: 400, fontSize: 13 }}>ABCDEFGHIJKLM · abcdefghijklm · 0123456789</span>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- do & don't */}
      <section className="bg-page">
        <h2 style={{ fontFamily: family }}>Don&rsquo;t</h2>
        <p className="bg-lede">Everything below is a version of the mark that has left the brand. None of it ships.</p>
        <div className="bg-donts">
          {byId.mark && (
            <>
              <div className="bg-dont-cell"><Mark svg={byId.mark.svg} className="bg-dont-stretch" /><span>Don&rsquo;t stretch it</span></div>
              <div className="bg-dont-cell"><Mark svg={byId.mark.svg} className="bg-dont-rotate" /><span>Don&rsquo;t rotate it</span></div>
              <div className="bg-dont-cell bg-dont-recolor"><Mark svg={byId.mark.svg} /><span>Don&rsquo;t recolour it</span></div>
              <div className="bg-dont-cell"><Mark svg={byId.mark.svg} className="bg-dont-shadow" /><span>Don&rsquo;t add effects</span></div>
              <div className="bg-dont-cell bg-dont-lowcontrast"><Mark svg={byId.mark.svg} /><span>Don&rsquo;t place on low contrast</span></div>
              <div className="bg-dont-cell bg-dont-crowd">
                <Mark svg={byId.mark.svg} />
                <span className="bg-dont-crowd-text">crowded by other marks</span>
                <span>Don&rsquo;t crowd it</span>
              </div>
            </>
          )}
        </div>
        <p className="bg-footer">Generated by Routicle from this brand&rsquo;s own logo pack.</p>
      </section>
    </div>
  )
}
