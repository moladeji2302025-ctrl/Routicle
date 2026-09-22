/**
 * Warps a rectangular image into an arbitrary convex quadrilateral — the same
 * math behind "Free Transform > Perspective" in an image editor. The 3x3
 * projective homography is solved directly from the four point
 * correspondences (source corner i -> destination corner i) via the standard
 * DLT linear system, rather than composed from smaller building blocks —
 * that keeps each source corner's destination explicit and easy to verify,
 * instead of resting on a matrix-algebra shortcut that's easy to misapply.
 */

function multmv(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ]
}

/** Gaussian elimination with partial pivoting, for the 8x8 system below. */
function solveLinear(A, b) {
  const n = b.length
  for (let col = 0; col < n; col += 1) {
    let piv = col
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r
    }
    ;[A[col], A[piv]] = [A[piv], A[col]]
    ;[b[col], b[piv]] = [b[piv], b[col]]
    const pivVal = A[col][col]
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue
      const factor = A[r][col] / pivVal
      if (factor === 0) continue
      for (let c = col; c < n; c += 1) A[r][c] -= factor * A[col][c]
      b[r] -= factor * b[col]
    }
  }
  return b.map((v, i) => v / A[i][i])
}

/** The 3x3 homography (h8 fixed at 1) sending each src[i] to the matching dst[i]. */
function computeHomography(src, dst) {
  const A = []
  const b = []
  for (let i = 0; i < 4; i += 1) {
    const { x, y } = src[i]
    const { x: X, y: Y } = dst[i]
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y])
    b.push(X)
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y])
    b.push(Y)
  }
  const h = solveLinear(A, b)
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]
}

function det3(m) {
  return m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6])
}

function invert3(m) {
  const d = det3(m)
  return [
    (m[4] * m[8] - m[5] * m[7]) / d, (m[2] * m[7] - m[1] * m[8]) / d, (m[1] * m[5] - m[2] * m[4]) / d,
    (m[5] * m[6] - m[3] * m[8]) / d, (m[0] * m[8] - m[2] * m[6]) / d, (m[2] * m[3] - m[0] * m[5]) / d,
    (m[3] * m[7] - m[4] * m[6]) / d, (m[1] * m[6] - m[0] * m[7]) / d, (m[0] * m[4] - m[1] * m[3]) / d,
  ]
}

function sample(data, w, h, x, y) {
  if (x < 0 || y < 0 || x > w - 1 || y > h - 1) return null
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(x0 + 1, w - 1)
  const y1 = Math.min(y0 + 1, h - 1)
  const fx = x - x0
  const fy = y - y0
  const i00 = (y0 * w + x0) * 4
  const i10 = (y0 * w + x1) * 4
  const i01 = (y1 * w + x0) * 4
  const i11 = (y1 * w + x1) * 4
  const out = new Array(4)
  for (let c = 0; c < 4; c += 1) {
    const top = data[i00 + c] * (1 - fx) + data[i10 + c] * fx
    const bot = data[i01 + c] * (1 - fx) + data[i11 + c] * fx
    out[c] = top * (1 - fy) + bot * fy
  }
  return out
}

/**
 * Warps `sourceCanvas` (used at its full, natural size) into `quad` — four
 * {x, y} points given in order around the shape, in the destination's pixel
 * space. Returns a canvas sized (destW, destH) with the warped image sitting
 * in place and everywhere outside the quad left transparent, so it can be
 * composited directly onto a scene with `drawImage(result, 0, 0)`.
 */
export function warpToQuad(sourceCanvas, quad, destW, destH) {
  const sw = sourceCanvas.width
  const sh = sourceCanvas.height
  const src = sourceCanvas.getContext('2d').getImageData(0, 0, sw, sh).data

  const corners = [{ x: 0, y: 0 }, { x: sw, y: 0 }, { x: sw, y: sh }, { x: 0, y: sh }]
  const forward = computeHomography(corners, quad) // image px -> quad px
  const backward = invert3(forward) // quad px -> image px

  const xs = quad.map((p) => p.x)
  const ys = quad.map((p) => p.y)
  const minX = Math.max(0, Math.floor(Math.min(...xs)))
  const maxX = Math.min(destW, Math.ceil(Math.max(...xs)))
  const minY = Math.max(0, Math.floor(Math.min(...ys)))
  const maxY = Math.min(destH, Math.ceil(Math.max(...ys)))

  const out = document.createElement('canvas')
  out.width = destW
  out.height = destH
  if (maxX <= minX || maxY <= minY) return out

  const octx = out.getContext('2d')
  const region = octx.createImageData(maxX - minX, maxY - minY)

  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      const [sxw, syw, sww] = multmv(backward, [x + 0.5, y + 0.5, 1])
      const px = sample(src, sw, sh, sxw / sww, syw / sww)
      if (px) {
        const ri = ((y - minY) * (maxX - minX) + (x - minX)) * 4
        region.data[ri] = px[0]
        region.data[ri + 1] = px[1]
        region.data[ri + 2] = px[2]
        region.data[ri + 3] = px[3]
      }
    }
  }
  octx.putImageData(region, minX, minY)
  return out
}

/**
 * A centred, undistorted rectangle sized to the design's own aspect ratio
 * (width / height) — the "auto-fit" starting placement. Without matching the
 * asset's real proportions here, a wide lockup or a tall stack starts out
 * stretched into whatever generic box came before it.
 */
export function defaultQuad(canvasW, canvasH, aspect = 1, widthFrac = 0.46) {
  let qw = canvasW * widthFrac
  let qh = qw / aspect
  const maxH = canvasH * 0.8
  if (qh > maxH) {
    qh = maxH
    qw = qh * aspect
  }
  const cx = canvasW / 2
  const cy = canvasH / 2
  return [
    { x: cx - qw / 2, y: cy - qh / 2 },
    { x: cx + qw / 2, y: cy - qh / 2 },
    { x: cx + qw / 2, y: cy + qh / 2 },
    { x: cx - qw / 2, y: cy + qh / 2 },
  ]
}

/** width / height of an SVG's own viewBox — read straight from the markup, no image load needed. */
export function svgAspect(svg) {
  const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)
  if (!m) return 1
  return Number(m[1]) / Number(m[2])
}

function quadCentroid(quad) {
  const x = quad.reduce((s, p) => s + p.x, 0) / quad.length
  const y = quad.reduce((s, p) => s + p.y, 0) / quad.length
  return { x, y }
}

export function translateQuad(quad, dx, dy) {
  return quad.map((p) => ({ x: p.x + dx, y: p.y + dy }))
}

/** Scales the quad by `factor` around its own centroid — works on any quad, distorted or not. */
export function scaleQuad(quad, factor) {
  const c = quadCentroid(quad)
  return quad.map((p) => ({ x: c.x + (p.x - c.x) * factor, y: c.y + (p.y - c.y) * factor }))
}

/** Rotates the quad by `deg` degrees around its own centroid. */
export function rotateQuad(quad, deg) {
  const c = quadCentroid(quad)
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return quad.map((p) => {
    const dx = p.x - c.x
    const dy = p.y - c.y
    return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos }
  })
}

/**
 * Bakes brightness, contrast, a flat recolour and a mirror into a copy of
 * `raw` — cheap, synchronous canvas work, so it can run on every control
 * change without re-rasterising the source SVG.
 */
export function processDesign(raw, { tint = '', brightness = 1, contrast = 1, flipH = false, flipV = false } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = raw.width
  canvas.height = raw.height
  const ctx = canvas.getContext('2d')

  ctx.save()
  ctx.filter = `brightness(${brightness}) contrast(${contrast})`
  ctx.translate(flipH ? canvas.width : 0, flipV ? canvas.height : 0)
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
  ctx.drawImage(raw, 0, 0)
  ctx.restore()

  if (tint) {
    ctx.save()
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = tint
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }

  return canvas
}

/** Rasterises an SVG string (as produced by `buildLogoPack`) to a canvas at `scale`x its viewBox size. */
export function rasterizeSvg(svg, scale = 3) {
  return new Promise((resolve, reject) => {
    const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)
    const w = m ? Number(m[1]) : 512
    const h = m ? Number(m[2]) : 512
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(w * scale))
      canvas.height = Math.max(1, Math.round(h * scale))
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not rasterize that asset'))
    }
    img.src = url
  })
}
