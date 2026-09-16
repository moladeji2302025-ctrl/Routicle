/**
 * Turns one traced mark into a finished, exportable SVG under a set of
 * transforms — size, padding, weight, orientation, outline and a backing shape.
 *
 * The traced path arrives in its own pixel space, so nothing here assumes a
 * unit square: every placement scales the path into the target box and centres
 * it. Strokes are the fiddly part. They are expressed in the path's own
 * pre-scale units, so a width that should read as N on-screen pixels has to be
 * divided by the scale factor, otherwise weight would drift with icon size.
 */

export const BG_SHAPES = [
  { id: 'none', label: 'None' },
  { id: 'square', label: 'Rounded square' },
  { id: 'squircle', label: 'Squircle' },
  { id: 'circle', label: 'Circle' },
  { id: 'hexagon', label: 'Hexagon' },
  { id: 'shield', label: 'Shield' },
]

export const DEFAULTS = {
  size: 200,
  padding: 14,
  thickness: 0,
  traceWidth: 0,
  rotation: 0,
  skew: 0,
  flipH: false,
  flipV: false,
  fill: '#1c274c',
  line: '#000000',
  bgShape: 'none',
  bgColor: '#eef1f7',
}

/** The backing shape, drawn to fill the whole canvas. */
function backdrop(shape, s, color) {
  if (shape === 'none') return ''
  const h = s / 2
  switch (shape) {
    case 'square':
      return `<rect width="${s}" height="${s}" rx="${(s * 0.18).toFixed(2)}" fill="${color}"/>`
    case 'squircle':
      // A superellipse read as cubic segments — flatter shoulders than a rect's
      // corner radius gives, which is what makes it read as a squircle.
      return `<path d="M${h} 0C${s * 0.86} 0 ${s} ${s * 0.14} ${s} ${h}C${s} ${s * 0.86} ${s * 0.86} ${s} ${h} ${s}C${s * 0.14} ${s} 0 ${s * 0.86} 0 ${h}C0 ${s * 0.14} ${s * 0.14} 0 ${h} 0Z" fill="${color}"/>`
    case 'circle':
      return `<circle cx="${h}" cy="${h}" r="${h}" fill="${color}"/>`
    case 'hexagon': {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 180) * (60 * i - 90)
        return `${(h + h * Math.cos(a)).toFixed(2)},${(h + h * Math.sin(a)).toFixed(2)}`
      })
      return `<polygon points="${pts.join(' ')}" fill="${color}"/>`
    }
    case 'shield':
      return `<path d="M${h} 0 ${s} ${s * 0.16}V${s * 0.55}C${s} ${s * 0.8} ${s * 0.78} ${s * 0.94} ${h} ${s}C${s * 0.22} ${s * 0.94} 0 ${s * 0.8} 0 ${s * 0.55}V${s * 0.16}Z" fill="${color}"/>`
    default:
      return ''
  }
}

export function buildMark(trace, opts = {}) {
  const o = { ...DEFAULTS, ...opts }
  const [, , vw, vh] = trace.viewBox.split(/\s+/).map(Number)

  const inner = Math.max(8, o.size)
  const pad = inner * (o.padding / 100)
  const canvas = Math.round(inner + pad * 2)
  const scale = inner / Math.max(vw, vh)
  const c = canvas / 2

  // Rotate, flip and skew all happen about the canvas centre, so the mark
  // stays put no matter which of them is applied.
  const transform = [
    `translate(${c} ${c})`,
    o.rotation ? `rotate(${o.rotation})` : '',
    o.skew ? `skewX(${o.skew})` : '',
    `scale(${(o.flipH ? -scale : scale).toFixed(5)} ${(o.flipV ? -scale : scale).toFixed(5)})`,
    `translate(${(-vw / 2).toFixed(2)} ${(-vh / 2).toFixed(2)})`,
  ]
    .filter(Boolean)
    .join(' ')

  // Divided by scale so a slider percentage means the same visual weight at
  // every icon size.
  const grow = (inner * (o.thickness / 100) * 0.4) / scale
  const outline = (inner * (o.traceWidth / 100) * 0.4) / scale

  const layers = [
    // Fattening the glyph is a same-colour stroke under the fill, which
    // thickens strokes and closes small gaps without distorting the outline.
    grow > 0
      ? `<path d="${trace.pathData}" fill="${o.fill}" stroke="${o.fill}" stroke-width="${grow.toFixed(3)}" stroke-linejoin="round" fill-rule="evenodd"/>`
      : `<path d="${trace.pathData}" fill="${o.fill}" fill-rule="evenodd"/>`,
    outline > 0
      ? `<path d="${trace.pathData}" fill="none" stroke="${o.line}" stroke-width="${outline.toFixed(3)}" stroke-linejoin="round" fill-rule="evenodd"/>`
      : '',
  ].filter(Boolean)

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas} ${canvas}" width="${canvas}" height="${canvas}">` +
    backdrop(o.bgShape, canvas, o.bgColor) +
    `<g transform="${transform}">${layers.join('')}</g>` +
    '</svg>'
  )
}
