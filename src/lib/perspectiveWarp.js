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
 * Which two corner indices bound each edge, and in which direction — shared
 * by rendering (`coonsPoint`) and interaction (handle position + drag math)
 * so both always agree on what "this edge's curve" means. Order: top
 * (0->1), right (1->2), bottom (3->2, so its parameter runs the same
 * direction as top's), left (0->3, so its parameter runs the same
 * direction as right's) — the pairing the Coons patch formula assumes.
 */
export const EDGE_PAIRS = [[0, 1], [1, 2], [3, 2], [0, 3]]

/** The bezier handle's position for one edge, `bulge` fractions of the edge's own length off its midpoint. */
export function edgeControlPoint(a, b, bulge) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  return { x: mx + nx * bulge * len, y: my + ny * bulge * len }
}

/** Inverse of `edgeControlPoint`: the bulge fraction a dragged point `p` represents for edge a->b. */
export function bulgeFromPoint(a, b, p) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  return ((p.x - mx) * nx + (p.y - my) * ny) / len
}

export function quadBezier(p0, c, p1, t) {
  const mt = 1 - t
  return { x: mt * mt * p0.x + 2 * mt * t * c.x + t * t * p1.x, y: mt * mt * p0.y + 2 * mt * t * c.y + t * t * p1.y }
}

/** Points tracing one edge's curve from `a` to `b`, for drawing the on-screen guide. */
export function edgeCurvePoints(a, b, bulge, steps = 14) {
  const c = edgeControlPoint(a, b, bulge)
  const pts = []
  for (let i = 0; i <= steps; i += 1) pts.push(quadBezier(a, c, b, i / steps))
  return pts
}

/**
 * A Coons patch: the destination point for source-space (u, v) given the
 * quad's 4 corners and each edge's bulge. Each edge is a quadratic bezier
 * from corner to corner through `edgeControlPoint`; with every bulge at 0
 * that control point sits exactly on the straight edge's midpoint, which
 * collapses each bezier to a straight line and this formula to plain
 * bilinear quad interpolation — so a flat quad warps identically to before.
 */
function coonsPoint(quad, bulges, u, v) {
  const [p0, p1, p2, p3] = quad
  const cTop = edgeControlPoint(p0, p1, bulges[0])
  const cRight = edgeControlPoint(p1, p2, bulges[1])
  const cBottom = edgeControlPoint(p3, p2, bulges[2])
  const cLeft = edgeControlPoint(p0, p3, bulges[3])

  const t = quadBezier(p0, cTop, p1, u)
  const b = quadBezier(p3, cBottom, p2, u)
  const l = quadBezier(p0, cLeft, p3, v)
  const r = quadBezier(p1, cRight, p2, v)

  const blend = (key) => (1 - v) * t[key] + v * b[key] + (1 - u) * l[key] + u * r[key]
  const corner = (key) =>
    (1 - u) * (1 - v) * p0[key] + u * (1 - v) * p1[key] + (1 - u) * v * p3[key] + u * v * p2[key]

  return { x: blend('x') - corner('x'), y: blend('y') - corner('y') }
}

/**
 * Warps `sourceCanvas` into a curved-edge quad — `quad`'s 4 corners plus one
 * bulge fraction per edge (`bulges`, same order as `EDGE_PAIRS`, 0 = dead
 * straight). Since a single homography can only ever produce straight
 * edges, this subdivides the source into a `grid`x`grid` mesh, finds each
 * cell's 4 destination corners via the Coons patch above, and warps each
 * small cell with the same per-cell homography `warpToQuad` uses for the
 * whole image — fine enough to look like a smooth curve, coarse enough to
 * redraw live while dragging.
 */
export function warpMesh(sourceCanvas, quad, bulges, destW, destH, grid = 16) {
  const straight = bulges.every((b) => Math.abs(b) < 0.001)
  if (straight) return warpToQuad(sourceCanvas, quad, destW, destH)

  const sw = sourceCanvas.width
  const sh = sourceCanvas.height
  const src = sourceCanvas.getContext('2d').getImageData(0, 0, sw, sh).data

  const out = document.createElement('canvas')
  out.width = destW
  out.height = destH
  const octx = out.getContext('2d')
  const buffer = octx.createImageData(destW, destH)

  const cols = grid
  const rows = Math.max(4, Math.round(grid * 0.7))

  for (let j = 0; j < rows; j += 1) {
    const v0 = j / rows
    const v1 = (j + 1) / rows
    for (let i = 0; i < cols; i += 1) {
      const u0 = i / cols
      const u1 = (i + 1) / cols

      const srcCorners = [{ x: u0 * sw, y: v0 * sh }, { x: u1 * sw, y: v0 * sh }, { x: u1 * sw, y: v1 * sh }, { x: u0 * sw, y: v1 * sh }]
      const dstCorners = [coonsPoint(quad, bulges, u0, v0), coonsPoint(quad, bulges, u1, v0), coonsPoint(quad, bulges, u1, v1), coonsPoint(quad, bulges, u0, v1)]

      const forward = computeHomography(srcCorners, dstCorners)
      const backward = invert3(forward)

      const xs = dstCorners.map((p) => p.x)
      const ys = dstCorners.map((p) => p.y)
      const minX = Math.max(0, Math.floor(Math.min(...xs)))
      const maxX = Math.min(destW, Math.ceil(Math.max(...xs)) + 1)
      const minY = Math.max(0, Math.floor(Math.min(...ys)))
      const maxY = Math.min(destH, Math.ceil(Math.max(...ys)) + 1)

      for (let y = minY; y < maxY; y += 1) {
        for (let x = minX; x < maxX; x += 1) {
          const [sxw, syw, sww] = multmv(backward, [x + 0.5, y + 0.5, 1])
          const sx = sxw / sww
          const sy = syw / sww
          // Cell bounds are approximate once the surface curves, so samples
          // are also checked against the cell's own source rectangle — this
          // keeps neighbouring cells from bleeding into each other at edges.
          if (sx < u0 * sw - 1 || sx > u1 * sw + 1 || sy < v0 * sh - 1 || sy > v1 * sh + 1) continue
          const px = sample(src, sw, sh, sx, sy)
          if (!px) continue
          const ri = (y * destW + x) * 4
          buffer.data[ri] = px[0]
          buffer.data[ri + 1] = px[1]
          buffer.data[ri + 2] = px[2]
          buffer.data[ri + 3] = px[3]
        }
      }
    }
  }

  octx.putImageData(buffer, 0, 0)
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
