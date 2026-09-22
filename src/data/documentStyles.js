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
 *   kinds    which document kinds offer this style. Unset = all four. The
 *            proposal/contract/brief styles below don't set it (they read
 *            fine as an invoice too, just without a bespoke layout); the
 *            invoice styles at the bottom set kinds: ['invoice'], because
 *            their whole reason to exist is a layout that only means
 *            anything on an invoice — DocumentRenderer.jsx targets each by
 *            its style id directly (`.dt-style-<id> .dt-invoice`).
 */
export const DOCUMENT_STYLES = [
  {
    id: 'branded',
    name: 'Branded',
    blurb: 'The original: bold orange cover, grey pages, serif display.',
    // The template sets its title in Century Schoolbook Bold, which is
    // commercial. PT Serif Bold has the same weight, width and terminals.
    display: 'PT Serif',
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
    cover: 'poster',
    heads: 'boxed',
    corners: 0,
    colors: { accent: '#111111', page: '#FFFFFF', ink: '#111111', muted: '#555555', panel: '#F1F1F1', coverInk: '#FFFFFF' },
  },
  {
    id: 'editorial',
    name: 'Editorial',
    blurb: 'Cream paper, a literary serif and deep green details.',
    display: 'Fraunces',
    body: 'Lora',
    cover: 'masthead',
    coverItalic: true,
    coverWeight: 400,
    heads: 'tab',
    corners: 0,
    colors: { accent: '#1F4D3A', page: '#F5F0E6', ink: '#1B1B18', muted: '#58564E', panel: '#E8E1D2', coverInk: '#1B1B18' },
  },
  {
    id: 'studio',
    name: 'Studio',
    blurb: 'Near-black cover with an electric lime accent.',
    display: 'Space Grotesk',
    body: 'Space Grotesk',
    cover: 'terminal',
    heads: 'mono',
    corners: 0,
    colors: { accent: '#C8F135', page: '#FFFFFF', ink: '#0F1115', muted: '#50535A', panel: '#F0F1EE', coverInk: '#FFFFFF', coverBg: '#0F1115', accentInk: '#0F1115' },
  },
  {
    id: 'soft',
    name: 'Soft',
    blurb: 'Rounded panels, violet accents and friendly type.',
    display: 'Poppins',
    body: 'DM Sans',
    cover: 'sticker',
    heads: 'tab',
    corners: 14,
    colors: { accent: '#6750DE', page: '#FFFFFF', ink: '#17161C', muted: '#5B5A66', panel: '#F1EFFC', coverInk: '#17161C' },
  },
  {
    id: 'corporate',
    name: 'Corporate',
    blurb: 'Navy and white, for clients who want it buttoned up.',
    display: 'IBM Plex Sans',
    body: 'IBM Plex Sans',
    cover: 'grid',
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
    cover: 'blueprint',
    heads: 'ghost',
    corners: 6,
    colors: { accent: '#B4532A', page: '#FBF6F0', ink: '#241A14', muted: '#6A5A4F', panel: '#F1E6DA', coverInk: '#241A14' },
  },

  /* --------------------------------------------------------------------
   * Twenty more, for proposals, contracts and design briefs. Same page
   * structure as the seven above — cover archetype, heading treatment,
   * corner radius, a font pairing and a palette — just more of them.
   * ------------------------------------------------------------------ */
  {
    id: 'slate',
    name: 'Slate',
    blurb: 'Cool indigo on white, built for a technical reader.',
    display: 'Sora',
    body: 'Manrope',
    cover: 'diagonal',
    heads: 'numbered',
    corners: 4,
    colors: { accent: '#3B5BDB', page: '#FFFFFF', ink: '#10131A', muted: '#545B6B', panel: '#EEF1F8', coverInk: '#10131A' },
  },
  {
    id: 'blush',
    name: 'Blush',
    blurb: 'Rose and cream, a soft display serif on the cover.',
    display: 'DM Serif Display',
    body: 'Work Sans',
    cover: 'torn',
    heads: 'tab',
    corners: 18,
    colors: { accent: '#D9668B', page: '#FFF7F5', ink: '#2B1620', muted: '#7A5560', panel: '#FBE6EA', coverInk: '#2B1620' },
  },
  {
    id: 'forest',
    name: 'Forest',
    blurb: 'Deep pine green and linen, an outdoorsy quiet.',
    display: 'Newsreader',
    body: 'Inter',
    cover: 'halftone',
    heads: 'ghost',
    corners: 2,
    colors: { accent: '#2F5233', page: '#F6F4EC', ink: '#1C2419', muted: '#566153', panel: '#E4E6D9', coverInk: '#1C2419' },
  },
  {
    id: 'neon',
    name: 'Neon',
    blurb: 'Near-black cover, a shock of magenta, wide grotesk.',
    display: 'Unbounded',
    body: 'Sora',
    cover: 'glitch',
    heads: 'mono',
    corners: 0,
    colors: { accent: '#FF2E9A', page: '#FFFFFF', ink: '#0B0A10', muted: '#55525C', panel: '#F4EEF3', coverBg: '#08060B' },
  },
  {
    id: 'porcelain',
    name: 'Porcelain',
    blurb: 'Black on white, nothing else. A long, quiet serif.',
    display: 'Cormorant Garamond',
    body: 'Karla',
    cover: 'minimal',
    heads: 'plain',
    corners: 0,
    colors: { accent: '#1A1A1A', page: '#FFFFFF', ink: '#141414', muted: '#6B6B6B', panel: '#F5F5F5', coverInk: '#141414' },
  },
  {
    id: 'sandstone',
    name: 'Sandstone',
    blurb: 'Warm tan and a slab serif, like a site plan.',
    display: 'Zilla Slab',
    body: 'Barlow',
    cover: 'frame',
    heads: 'boxed',
    corners: 4,
    colors: { accent: '#A9773C', page: '#F7F1E6', ink: '#2C2419', muted: '#6B5E4C', panel: '#ECE1CC', coverInk: '#2C2419' },
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    blurb: 'Saturated blue cover, heavy grotesk display.',
    display: 'Archivo Black',
    body: 'Archivo',
    cover: 'stacked',
    heads: 'boxed',
    corners: 0,
    colors: { accent: '#0B4FDE', page: '#FFFFFF', ink: '#0A0E1A', muted: '#4D5568', panel: '#EAF0FF', coverInk: '#FFFFFF' },
  },
  {
    id: 'rosewood',
    name: 'Rosewood',
    blurb: 'Burgundy and parchment, an old-money elegance.',
    display: 'Cormorant',
    body: 'EB Garamond',
    cover: 'foil',
    heads: 'ghost',
    corners: 0,
    colors: { accent: '#6B1F2A', page: '#FBF7F4', ink: '#241012', muted: '#6B4E51', panel: '#F0DEDF', coverInk: '#241012' },
  },
  {
    id: 'citrus',
    name: 'Citrus',
    blurb: 'Bright marigold, rounded panels, a friendly grotesk.',
    display: 'Bricolage Grotesque',
    body: 'Inter',
    cover: 'split',
    heads: 'tab',
    corners: 20,
    colors: { accent: '#F2A81D', page: '#FFFDF7', ink: '#2B2308', muted: '#6E6142', panel: '#FCEFCB', coverInk: '#2B2308' },
  },
  {
    id: 'graphite',
    name: 'Graphite',
    blurb: 'Charcoal and off-white, understated and corporate.',
    display: 'Hanken Grotesk',
    body: 'Hanken Grotesk',
    cover: 'top',
    heads: 'rule',
    corners: 2,
    colors: { accent: '#3D3D3D', page: '#FAFAFA', ink: '#1B1B1B', muted: '#5C5C5C', panel: '#EDEDED', coverInk: '#1B1B1B' },
  },
  {
    id: 'azure',
    name: 'Azure',
    blurb: 'Sky blue and white, a fresh product-launch feel.',
    display: 'Plus Jakarta Sans',
    body: 'Plus Jakarta Sans',
    cover: 'poster',
    heads: 'tab',
    corners: 16,
    colors: { accent: '#1CA7EC', page: '#FFFFFF', ink: '#10202B', muted: '#4E6270', panel: '#E7F6FE', coverInk: '#10202B' },
  },
  {
    id: 'umber',
    name: 'Umber',
    blurb: 'Copper and cream, a small-caps display face.',
    display: 'Marcellus',
    body: 'Jost',
    cover: 'foil',
    heads: 'ghost',
    corners: 0,
    colors: { accent: '#8C5A2B', page: '#FAF5EE', ink: '#2A1D10', muted: '#6B5A46', panel: '#EFE1CE', coverInk: '#2A1D10' },
  },
  {
    id: 'chalk',
    name: 'Chalk',
    blurb: 'Pale lavender-grey, an academic hand.',
    display: 'Spectral',
    body: 'Inter',
    cover: 'grid',
    heads: 'rule',
    corners: 6,
    colors: { accent: '#6E6AA8', page: '#F7F6FB', ink: '#201F2B', muted: '#5E5C72', panel: '#EAE8F5', coverInk: '#201F2B' },
  },
  {
    id: 'volt',
    name: 'Volt',
    blurb: 'Lime on black, monospaced display numerals.',
    display: 'Chivo Mono',
    body: 'Chivo',
    cover: 'bleed',
    heads: 'mono',
    corners: 0,
    colors: { accent: '#D4FF3F', page: '#FFFFFF', ink: '#0D0F0A', muted: '#4E5245', panel: '#F1F5E4', coverBg: '#0D0F0A', accentInk: '#0D0F0A' },
  },
  {
    id: 'coral',
    name: 'Coral',
    blurb: 'Sunset orange and cream, a rounded slab serif.',
    display: 'Bitter',
    body: 'Nunito Sans',
    cover: 'sticker',
    heads: 'tab',
    corners: 10,
    colors: { accent: '#E8703A', page: '#FFF9F5', ink: '#2E1B10', muted: '#7A5B49', panel: '#FBE3D3', coverInk: '#2E1B10' },
  },
  {
    id: 'indigo-night',
    name: 'Indigo Night',
    blurb: 'A near-black cover, gold rule, a dramatic capitals face.',
    display: 'Cinzel',
    body: 'EB Garamond',
    cover: 'diagonal',
    heads: 'ghost',
    corners: 0,
    colors: { accent: '#C9A14A', page: '#FFFFFF', ink: '#14131F', muted: '#55536B', panel: '#EFEEF6', coverBg: '#14131F' },
  },
  {
    id: 'mint',
    name: 'Mint',
    blurb: 'Clean mint and white, a modern product face.',
    display: 'Outfit',
    body: 'Inter',
    cover: 'stacked',
    heads: 'numbered',
    corners: 12,
    colors: { accent: '#17A672', page: '#FFFFFF', ink: '#0C1F17', muted: '#4B6156', panel: '#E6F7EF', coverInk: '#0C1F17' },
  },
  {
    id: 'ash-rose',
    name: 'Ash Rose',
    blurb: 'Dusty rose and charcoal, a quiet, grown-up serif.',
    display: 'Instrument Serif',
    body: 'Instrument Sans',
    cover: 'torn',
    heads: 'boxed',
    corners: 0,
    colors: { accent: '#9C6B70', page: '#F8F5F4', ink: '#241E1F', muted: '#6B5C5D', panel: '#ECE3E3', coverInk: '#241E1F' },
  },
  {
    id: 'signal',
    name: 'Signal',
    blurb: 'High-contrast red and black, a condensed display.',
    display: 'Big Shoulders Display',
    body: 'Inter',
    cover: 'bleed',
    heads: 'mono',
    corners: 0,
    colors: { accent: '#E5342B', page: '#FFFFFF', ink: '#120A09', muted: '#5A4C4A', panel: '#FBEAE8', coverInk: '#FFFFFF' },
  },
  {
    id: 'linen',
    name: 'Linen',
    blurb: 'Off-white and taupe, two quiet serifs, nothing loud.',
    display: 'Domine',
    body: 'Source Serif 4',
    cover: 'masthead',
    heads: 'rule',
    corners: 0,
    colors: { accent: '#7A6A53', page: '#FAF8F3', ink: '#26221B', muted: '#6B6153', panel: '#EFE9DC', coverInk: '#26221B' },
  },

  /* --------------------------------------------------------------------
   * Fifteen more, for the invoice only. The seven original styles (and the
   * twenty above) all draw the invoice with the same block-flow layout —
   * head, meta, parties, lines, totals, bank, top to bottom. These instead
   * rearrange that page: a sidebar, a stub, cards instead of table rows, a
   * watermark total. DocumentRenderer.jsx's CSS targets each of these ids
   * directly (`.dt-style-<id> .dt-invoice`) to draw the rearrangement; the
   * font and palette below are what makes it also look like its own thing.
   * ------------------------------------------------------------------ */
  {
    id: 'inv-ledger',
    name: 'Ledger',
    blurb: 'A left column of numbers, like a bookkeeper’s page.',
    display: 'IBM Plex Mono',
    body: 'IBM Plex Sans',
    cover: 'minimal',
    heads: 'plain',
    corners: 0,
    kinds: ['invoice'],
    colors: { accent: '#1D3F2E', page: '#FFFFFF', ink: '#111A15', muted: '#556359', panel: '#EAF0EC', coverInk: '#111A15' },
  },
  {
    id: 'inv-statement',
    name: 'Statement',
    blurb: 'Meta as a row of pills beneath the header, bank-style.',
    display: 'Inter',
    body: 'Inter',
    cover: 'minimal',
    heads: 'plain',
    corners: 10,
    kinds: ['invoice'],
    colors: { accent: '#0B5FFF', page: '#FFFFFF', ink: '#0A1220', muted: '#4E5A72', panel: '#EAF0FF', coverInk: '#0A1220' },
  },
  {
    id: 'inv-bracket',
    name: 'Bracket',
    blurb: 'A heavy double rule frames the page; totals in a boxed cell.',
    display: 'Libre Franklin',
    body: 'Libre Franklin',
    cover: 'minimal',
    heads: 'plain',
    corners: 0,
    kinds: ['invoice'],
    colors: { accent: '#111111', page: '#FFFFFF', ink: '#111111', muted: '#565656', panel: '#F2F2F2', coverInk: '#111111' },
  },
  {
    id: 'inv-stub',
    name: 'Stub',
    blurb: 'A tinted right-hand column holds the totals, like a tear-off.',
    display: 'Space Grotesk',
    body: 'Space Grotesk',
    cover: 'minimal',
    heads: 'plain',
    corners: 0,
    kinds: ['invoice'],
    colors: { accent: '#6750DE', page: '#FFFFFF', ink: '#16161A', muted: '#5B5A66', panel: '#F1EFFC', coverInk: '#16161A' },
  },
  {
    id: 'inv-cards',
    name: 'Cards',
    blurb: 'Each line item is its own card, not a table row.',
    display: 'Poppins',
    body: 'DM Sans',
    cover: 'minimal',
    heads: 'plain',
    corners: 14,
    kinds: ['invoice'],
    colors: { accent: '#E8623D', page: '#FFFBF8', ink: '#241B16', muted: '#71615A', panel: '#FBE6DC', coverInk: '#241B16' },
  },
  {
    id: 'inv-minimal',
    name: 'Bare',
    blurb: 'No boxes anywhere. Hairlines, huge margins, plain totals.',
    display: 'Inter',
    body: 'Inter',
    cover: 'minimal',
    heads: 'plain',
    corners: 0,
    kinds: ['invoice'],
    colors: { accent: '#111111', page: '#FFFFFF', ink: '#111111', muted: '#6B6B6B', panel: '#FAFAFA', coverInk: '#111111' },
  },
  {
    id: 'inv-compact',
    name: 'Compact',
    blurb: 'Dense and small: the header and the meta share one line.',
    display: 'Roboto Condensed',
    body: 'Roboto',
    cover: 'minimal',
    heads: 'plain',
    corners: 2,
    kinds: ['invoice'],
    colors: { accent: '#1D3F8F', page: '#FFFFFF', ink: '#101828', muted: '#54596B', panel: '#EDF1F8', coverInk: '#101828' },
  },
  {
    id: 'inv-receipt',
    name: 'Receipt',
    blurb: 'A narrow centred column with dashed rules, like a till slip.',
    display: 'Courier Prime',
    body: 'Courier Prime',
    cover: 'minimal',
    heads: 'plain',
    corners: 0,
    kinds: ['invoice'],
    colors: { accent: '#111111', page: '#FFFFFF', ink: '#111111', muted: '#595959', panel: '#F4F4F4', coverInk: '#111111' },
  },
  {
    id: 'inv-splithead',
    name: 'Split Head',
    blurb: 'The title and the invoice details share the top row.',
    display: 'Fraunces',
    body: 'Lora',
    cover: 'minimal',
    heads: 'plain',
    corners: 0,
    kinds: ['invoice'],
    colors: { accent: '#1F4D3A', page: '#F5F0E6', ink: '#1B1B18', muted: '#58564E', panel: '#E8E1D2', coverInk: '#1B1B18' },
  },
  {
    id: 'inv-sidebar',
    name: 'Sidebar Totals',
    blurb: 'Totals and bank details run down a right column all the way.',
    display: 'Sora',
    body: 'Inter',
    cover: 'minimal',
    heads: 'plain',
    corners: 8,
    kinds: ['invoice'],
    colors: { accent: '#0B4FDE', page: '#FFFFFF', ink: '#0A0E1A', muted: '#4D5568', panel: '#EAF0FF', coverInk: '#0A0E1A' },
  },
  {
    id: 'inv-stamped',
    name: 'Stamped',
    blurb: 'A giant ghost numeral sits behind the total, like a stamp.',
    display: 'Archivo Black',
    body: 'Archivo',
    cover: 'minimal',
    heads: 'plain',
    corners: 0,
    kinds: ['invoice'],
    colors: { accent: '#B4532A', page: '#FBF6F0', ink: '#241A14', muted: '#6A5A4F', panel: '#F1E6DA', coverInk: '#241A14' },
  },
  {
    id: 'inv-tiles',
    name: 'Tiles',
    blurb: 'Bill-to, payable-to and the invoice meta as three tiles.',
    display: 'Manrope',
    body: 'Manrope',
    cover: 'minimal',
    heads: 'plain',
    corners: 12,
    kinds: ['invoice'],
    colors: { accent: '#17A672', page: '#FFFFFF', ink: '#0C1F17', muted: '#4B6156', panel: '#E6F7EF', coverInk: '#0C1F17' },
  },
  {
    id: 'inv-letter',
    name: 'Letter',
    blurb: 'Reads like a formal letter, with a line of running text.',
    display: 'Playfair Display',
    body: 'PT Serif',
    cover: 'minimal',
    heads: 'plain',
    corners: 0,
    kinds: ['invoice'],
    colors: { accent: '#241012', page: '#FBF7F4', ink: '#241012', muted: '#6B4E51', panel: '#F0DEDF', coverInk: '#241012' },
  },
  {
    id: 'inv-rail',
    name: 'Rail',
    blurb: 'A colour stripe runs down the left edge of the page.',
    display: 'Outfit',
    body: 'Inter',
    cover: 'minimal',
    heads: 'plain',
    corners: 0,
    kinds: ['invoice'],
    colors: { accent: '#D4FF3F', page: '#FFFFFF', ink: '#0D0F0A', muted: '#4E5245', panel: '#F1F5E4', coverInk: '#0D0F0A' },
  },
  {
    id: 'inv-dashboard',
    name: 'Dashboard',
    blurb: 'The total sits in a big coloured tile, SaaS-invoice style.',
    display: 'Plus Jakarta Sans',
    body: 'Plus Jakarta Sans',
    cover: 'minimal',
    heads: 'plain',
    corners: 14,
    kinds: ['invoice'],
    colors: { accent: '#6750DE', page: '#FFFFFF', ink: '#17161C', muted: '#5B5A66', panel: '#F1EFFC', coverInk: '#17161C' },
  },
]

export const DEFAULT_STYLE_ID = 'branded'

/** The weight and slant a style sets its cover title in. */
export const coverFace = (style) => ({ weight: style.coverWeight || 700, italic: Boolean(style.coverItalic) })

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
