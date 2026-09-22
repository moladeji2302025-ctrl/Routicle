/**
 * Draws the brand — mark and name, in its own palette and typeface — onto a
 * plain 2D canvas, for use as a texture on a 3D mockup. The mark is drawn
 * straight from its traced path data via Path2D, which Canvas2D accepts SVG
 * path syntax for directly; no image round trip, no extra load.
 */

function drawMark(ctx, trace, x, y, size, color) {
  const [, , vw, vh] = trace.viewBox.split(/\s+/).map(Number)
  const scale = size / Math.max(vw, vh)
  ctx.save()
  ctx.translate(x - (vw * scale) / 2, y - (vh * scale) / 2)
  ctx.scale(scale, scale)
  ctx.fillStyle = color
  ctx.fill(new Path2D(trace.pathData), 'evenodd')
  ctx.restore()
}

function stackFor(font) {
  return font ? `'${String(font).replace(/'/g, '')}', system-ui, sans-serif` : 'system-ui, sans-serif'
}

/**
 * @param style 'wrap'   a horizontal band, the lockup repeated — for a
 *                       cylinder's UVs, which wrap U all the way around
 *              'center' one lockup, centred — for a flat face (a box, a
 *                       tote's front panel)
 */
export function renderBrandTexture({ trace, name, palette, font, width = 1024, height = 512, style = 'center' }) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const ink = palette[0]
  const paper = palette[palette.length - 1]
  const label = name || 'Your Brand'
  const family = stackFor(font)

  ctx.fillStyle = paper
  ctx.fillRect(0, 0, width, height)

  if (style === 'wrap') {
    // Repeated three times across the wrap, so at least one full lockup is
    // facing the camera from any angle the mug is rotated to.
    const markSize = height * 0.34
    const fontSize = height * 0.09
    ctx.font = `700 ${fontSize}px ${family}`
    ctx.textBaseline = 'middle'
    const textWidth = ctx.measureText(label).width
    const unit = markSize + 24 + textWidth
    const repeats = Math.max(3, Math.ceil((width * 1.4) / unit))
    const gap = width / repeats
    for (let i = 0; i < repeats; i += 1) {
      const cx = gap * i + gap / 2
      drawMark(ctx, trace, cx - textWidth / 2 - 16, height / 2, markSize, ink)
      ctx.fillStyle = ink
      ctx.textAlign = 'left'
      ctx.fillText(label, cx - textWidth / 2 + markSize / 2 + 4, height / 2 + fontSize * 0.04)
    }
  } else {
    const markSize = height * 0.32
    drawMark(ctx, trace, width / 2, height * 0.42, markSize, ink)
    const fontSize = height * 0.075
    ctx.font = `700 ${fontSize}px ${family}`
    ctx.fillStyle = ink
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, width / 2, height * 0.68)
  }

  return canvas
}
