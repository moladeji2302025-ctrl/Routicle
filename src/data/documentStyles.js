/**
 * The looks a generated document can take.
 *
 * The content of a proposal is the same whichever style is picked: the style
 * only decides the fonts, the colours and a few layout choices (how the cover
 * is built, how section headings sit). So switching style on a finished
 * document is instant and loses nothing.
 *
 * "Branded" is the reference: it reproduces the Branded Proposal, Contract and
 * Invoice templates the Business Suite was built from. The rest are variations
 * on the same page structure.
 *
 *   cover    bleed    full-bleed colour, huge display title (the reference)
 *            split    colour band on the left, title on the page colour
 *            top      colour band across the top, title underneath
 *            frame    page colour, title inside a ruled frame
 *            minimal  page colour, title at the foot with a hairline above
 *   heads    plain    large light heading (the reference)
 *            rule     heading over an accent rule
 *            numbered heading with its section number set in the accent
 *   corners  0 for square panels, a radius for rounded ones
 */
export const DOCUMENT_STYLES = [
  {
    id: 'branded',
    name: 'Branded',
    blurb: 'The original: bold orange cover, grey pages, serif display.',
    display: 'DM Serif Display',
    body: 'Montserrat',
    cover: 'bleed',
    heads: 'plain',
    corners: 0,
    colors: { accent: '#F65F24', page: '#E9E9E9', ink: '#111111', muted: '#4A4A4A', panel: '#D6D6D6', coverInk: '#FFFFFF' },
  },
  {
    id: 'mono',
    name: 'Mono',
    blurb: 'Black and white, tight grotesk type, nothing extra.',
    display: 'Inter Tight',
    body: 'Inter',
    cover: 'bleed',
    heads: 'rule',
    corners: 0,
    colors: { accent: '#111111', page: '#FFFFFF', ink: '#111111', muted: '#555555', panel: '#F1F1F1', coverInk: '#FFFFFF' },
  },
  {
    id: 'editorial',
    name: 'Editorial',
    blurb: 'Cream paper, a literary serif and deep green details.',
    display: 'Fraunces',
    body: 'Lora',
    cover: 'frame',
    heads: 'numbered',
    corners: 0,
    colors: { accent: '#1F4D3A', page: '#F5F0E6', ink: '#1B1B18', muted: '#58564E', panel: '#E8E1D2', coverInk: '#1B1B18' },
  },
  {
    id: 'studio',
    name: 'Studio',
    blurb: 'Near-black cover with an electric lime accent.',
    display: 'Space Grotesk',
    body: 'Space Grotesk',
    cover: 'bleed',
    heads: 'numbered',
    corners: 0,
    colors: { accent: '#C8F135', page: '#FFFFFF', ink: '#0F1115', muted: '#50535A', panel: '#F0F1EE', coverInk: '#FFFFFF', coverBg: '#0F1115', accentInk: '#0F1115' },
  },
  {
    id: 'soft',
    name: 'Soft',
    blurb: 'Rounded panels, violet accents and friendly type.',
    display: 'Poppins',
    body: 'DM Sans',
    cover: 'split',
    heads: 'plain',
    corners: 14,
    colors: { accent: '#6750DE', page: '#FFFFFF', ink: '#17161C', muted: '#5B5A66', panel: '#F1EFFC', coverInk: '#17161C' },
  },
  {
    id: 'corporate',
    name: 'Corporate',
    blurb: 'Navy and white, for clients who want it buttoned up.',
    display: 'IBM Plex Sans',
    body: 'IBM Plex Sans',
    cover: 'top',
    heads: 'rule',
    corners: 2,
    colors: { accent: '#1D3F8F', page: '#FFFFFF', ink: '#0E1A33', muted: '#4B5670', panel: '#EDF1F8', coverInk: '#0E1A33' },
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    blurb: 'Warm clay tones and a classic high-contrast serif.',
    display: 'Playfair Display',
    body: 'Karla',
    cover: 'minimal',
    heads: 'rule',
    corners: 6,
    colors: { accent: '#B4532A', page: '#FBF6F0', ink: '#241A14', muted: '#6A5A4F', panel: '#F1E6DA', coverInk: '#241A14' },
  },
]

export const DEFAULT_STYLE_ID = 'branded'

export function findStyle(id) {
  return DOCUMENT_STYLES.find((s) => s.id === id) || DOCUMENT_STYLES[0]
}

/** Black or white, whichever reads on the given background. */
export function inkOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return '#FFFFFF'
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  // Relative luminance, the WCAG way.
  const lin = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.42 ? '#111111' : '#FFFFFF'
}

/**
 * The CSS custom properties a document is drawn with. `accent` overrides the
 * style's own, so a studio can put its brand colour on any of the looks.
 */
export function styleVars(style, accentOverride) {
  const c = style.colors
  const accent = accentOverride || c.accent
  const coverBg = style.cover === 'bleed' ? (c.coverBg || accent) : c.page
  return {
    '--dt-accent': accent,
    '--dt-accent-ink': accentOverride ? inkOn(accent) : c.accentInk || inkOn(accent),
    '--dt-page': c.page,
    '--dt-ink': c.ink,
    '--dt-muted': c.muted,
    '--dt-panel': c.panel,
    '--dt-cover-bg': coverBg,
    '--dt-cover-ink': style.cover === 'bleed' ? inkOn(coverBg) : c.coverInk,
    '--dt-radius': `${style.corners}px`,
    '--dt-display': `"${style.display}", Georgia, serif`,
    '--dt-body': `"${style.body}", system-ui, sans-serif`,
  }
}
