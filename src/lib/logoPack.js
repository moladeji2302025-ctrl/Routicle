/**
 * Builds a full brand pack from one traced mark plus a name and a palette.
 *
 * Every asset is generated as SVG — the mark is already vector by the time it
 * arrives here, so rasterising is only ever done at export, from the SVG, at
 * whatever size is asked for. That keeps PNG and JPEG exports crisp instead of
 * upscaling the original snapshot.
 */

const esc = (s) =>
  String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const FONT_STACK = {
  satoshi: "'Satoshi', system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'SF Mono', ui-monospace, 'Cascadia Code', monospace",
  grotesk: "'Inter', system-ui, -apple-system, sans-serif",
}

/** Rough advance width, so the viewBox fits the text without measuring in DOM. */
const textWidth = (text, size, tracking = 0) => text.length * size * 0.56 + text.length * tracking

function wrap(inner, width, height, background) {
  // Round: the estimated text width carries floating-point noise, and a
  // viewBox of "397.28000000000003" ends up in a file the client opens.
  width = Math.round(width)
  height = Math.round(height)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    (background ? `<rect width="${width}" height="${height}" fill="${background}"/>` : '') +
    inner +
    '</svg>'
  )
}

/**
 * The traced path arrives in its own pixel space, so every placement scales it
 * into a target box and centres it rather than assuming a unit square.
 */
function markGroup({ pathData, viewBox }, { x, y, size, color }) {
  const [, , vw, vh] = viewBox.split(/\s+/).map(Number)
  const scale = size / Math.max(vw, vh)
  const dx = x + (size - vw * scale) / 2
  const dy = y + (size - vh * scale) / 2
  return `<g transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${scale.toFixed(4)})"><path d="${pathData}" fill="${color}" fill-rule="evenodd"/></g>`
}

export function buildLogoPack({ trace, name, tagline, palette, font = 'satoshi' }) {
  const family = FONT_STACK[font] || FONT_STACK.satoshi
  const ink = palette?.[0] || '#16161a'
  const accent = palette?.[1] || ink
  const paper = palette?.[palette.length - 1] || '#ffffff'
  const label = name || 'Your Brand'

  /* ---- brand mark: the symbol alone, square ---- */
  const mark = wrap(markGroup(trace, { x: 40, y: 40, size: 240, color: ink }), 320, 320, null)

  /* ---- wordmark: the name alone, no symbol ---- */
  const wmSize = 88
  const wmWidth = Math.max(360, textWidth(label, wmSize) + 120)
  const wordmark = wrap(
    `<text x="${wmWidth / 2}" y="${wmSize * 1.28}" font-family="${family}" font-size="${wmSize}" font-weight="700" letter-spacing="-2" fill="${ink}" text-anchor="middle">${esc(label)}</text>`,
    wmWidth,
    wmSize * 2,
    null
  )

  /* ---- primary: mark beside the name, the everyday lockup ---- */
  const pSize = 120
  const pTextW = textWidth(label, 72)
  const pWidth = pSize + 36 + pTextW + 80
  const primary = wrap(
    markGroup(trace, { x: 40, y: 40, size: pSize, color: ink }) +
      `<text x="${40 + pSize + 36}" y="${40 + pSize * 0.62}" font-family="${family}" font-size="72" font-weight="700" letter-spacing="-1.5" fill="${ink}">${esc(label)}</text>` +
      (tagline
        ? `<text x="${40 + pSize + 38}" y="${40 + pSize * 0.92}" font-family="${family}" font-size="24" letter-spacing="1.5" fill="${accent}">${esc(tagline)}</text>`
        : ''),
    pWidth,
    pSize + 80,
    null
  )

  /* ---- secondary: stacked, for square and narrow placements ---- */
  const sWidth = Math.max(360, textWidth(label, 52) + 120)
  const secondary = wrap(
    markGroup(trace, { x: (sWidth - 140) / 2, y: 48, size: 140, color: ink }) +
      `<text x="${sWidth / 2}" y="250" font-family="${family}" font-size="52" font-weight="700" letter-spacing="-1" fill="${ink}" text-anchor="middle">${esc(label)}</text>` +
      (tagline
        ? `<text x="${sWidth / 2}" y="286" font-family="${family}" font-size="20" letter-spacing="2" fill="${accent}" text-anchor="middle">${esc(tagline)}</text>`
        : ''),
    sWidth,
    tagline ? 320 : 290,
    null
  )

  /* ---- tertiary: reversed in a filled tile, for avatars and favicons ---- */
  const tertiary = wrap(
    `<rect width="320" height="320" rx="72" fill="${ink}"/>` +
      markGroup(trace, { x: 70, y: 70, size: 180, color: paper }),
    320,
    320,
    null
  )

  /* ---- palette: the colours as a deliverable in their own right ---- */
  const swatchW = 200
  const colours = palette || [ink]
  const paletteSvg = wrap(
    colours
      .map((c, i) => {
        // Label sits inside the swatch, flipped to white on dark fills.
        const dark = isDark(c)
        return (
          `<rect x="${i * swatchW}" y="0" width="${swatchW}" height="300" fill="${c}"/>` +
          `<text x="${i * swatchW + 20}" y="270" font-family="${family}" font-size="18" font-weight="600" fill="${dark ? '#ffffff' : '#16161a'}">${esc(c.toUpperCase())}</text>`
        )
      })
      .join(''),
    swatchW * colours.length,
    300,
    null
  )

  return [
    { id: 'primary', label: 'Primary logo', svg: primary, blurb: 'Mark and name side by side — the default lockup.' },
    { id: 'secondary', label: 'Secondary logo', svg: secondary, blurb: 'Stacked, for square and narrow placements.' },
    { id: 'tertiary', label: 'Tertiary logo', svg: tertiary, blurb: 'Reversed in a tile — avatars, favicons, app icons.' },
    { id: 'mark', label: 'Brand mark', svg: mark, blurb: 'The symbol on its own.' },
    { id: 'wordmark', label: 'Wordmark', svg: wordmark, blurb: 'The name on its own, no symbol.' },
    { id: 'palette', label: 'Colour palette', svg: paletteSvg, blurb: 'The palette as a shareable image.' },
  ]
}

export function isDark(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
  if (!m) return true
  const [r, g, b] = [1, 2, 3].map((i) => parseInt(m[i], 16))
  return (r * 299 + g * 587 + b * 114) / 1000 < 140
}

/* -------------------------------------------------------------- export */

/** SVG → raster, drawn at `scale` so exports stay sharp at any size. */
export function svgToRaster(svg, { type = 'image/png', scale = 3, background = null } = {}) {
  return new Promise((resolve, reject) => {
    const sized = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)
    const w = sized ? Number(sized[1]) : 512
    const h = sized ? Number(sized[2]) : 512

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      const ctx = canvas.getContext('2d')
      // JPEG has no alpha, so transparent areas would encode black without this.
      if (background || type === 'image/jpeg') {
        ctx.fillStyle = background || '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((out) => (out ? resolve(out) : reject(new Error('Export failed'))), type, 0.92)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not render that SVG'))
    }
    img.src = url
  })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const PALETTE_PRESETS = [
  { id: 'ink', label: 'Ink & paper', colors: ['#16161a', '#6750de', '#b199fd', '#f5f7fc'] },
  { id: 'earth', label: 'Earth', colors: ['#2f2113', '#a9714b', '#d9b08c', '#faf3e8'] },
  { id: 'forest', label: 'Forest', colors: ['#14281d', '#2f9e63', '#8fd3ae', '#f2f7f3'] },
  { id: 'ocean', label: 'Ocean', colors: ['#0c1f33', '#1f6f9e', '#6fc0d9', '#eff7fa'] },
  { id: 'ember', label: 'Ember', colors: ['#2a0f0f', '#d9432f', '#f0906f', '#fdf2ef'] },
  { id: 'mono', label: 'Monochrome', colors: ['#111111', '#555555', '#999999', '#f2f2f2'] },
]
