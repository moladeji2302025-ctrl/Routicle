/**
 * Raster → vector tracing, in the browser.
 *
 * Self-hosted on purpose: it costs nothing per use, needs no upload, and works
 * offline. The call is isolated behind `vectorize()` so swapping in a paid
 * tracer later is one function body, not a rewrite.
 *
 * The approach is the classic one for bilevel art: binarise, follow contours
 * with Moore-neighbour tracing, simplify each contour with Ramer-Douglas-
 * Peucker, then emit one path using the even-odd fill rule — which makes holes
 * (the inside of an O, a counter in a monogram) fall out for free rather than
 * needing winding direction worked out per contour.
 *
 * It is strong on what this tool is for — hand-drawn marks, flat logos, high
 * contrast scans — and deliberately not a photo tracer.
 */

const MAX_EDGE = 1000

/** Draws the file to a canvas, capped so tracing stays fast on phone photos. */
async function toImageData(file, maxEdge = MAX_EDGE) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('That image could not be read.'))
      el.src = url
    })

    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    // A transparent PNG would otherwise binarise as black; paint the paper first.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    return ctx.getImageData(0, 0, w, h)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Otsu's method: the cut that maximises between-class variance.
 *
 * Returns the middle of the winning plateau rather than its first value. On
 * flat art — a logo with exactly two luminance values, which is most of what
 * this tool is given — every `t` from the dark value up to just below the light
 * one separates the classes identically, so the variance is flat across that
 * whole range. Taking the first of them returns the dark value itself, and
 * since `binarise` cuts on a strict `gray < cut` that excludes the entire dark
 * class and traces nothing at all.
 */
function otsuThreshold(gray) {
  const hist = new Array(256).fill(0)
  for (let i = 0; i < gray.length; i += 1) hist[gray[i]] += 1

  const total = gray.length
  let sum = 0
  for (let t = 0; t < 256; t += 1) sum += t * hist[t]

  let sumB = 0
  let wB = 0
  let lo = 0
  let hi = 0
  let bestVar = -1

  for (let t = 0; t < 256; t += 1) {
    wB += hist[t]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    // A relative epsilon rather than `===`: the plateau's values are equal by
    // construction, but they are floats and large.
    if (between > bestVar * (1 + 1e-12)) {
      bestVar = between
      lo = t
      hi = t
    } else if (between >= bestVar * (1 - 1e-12)) {
      hi = t
    }
  }
  return Math.round((lo + hi) / 2)
}

function binarise(imageData, { threshold, invert }) {
  const { width, height, data } = imageData
  const gray = new Uint8Array(width * height)
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    // Rec. 601 luma — closer to perceived lightness than a flat average.
    gray[p] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
  }

  const cut = threshold == null ? otsuThreshold(gray) : threshold
  const bits = new Uint8Array(width * height)
  for (let p = 0; p < gray.length; p += 1) {
    const on = gray[p] < cut
    bits[p] = (invert ? !on : on) ? 1 : 0
  }
  return { bits, width, height, threshold: cut }
}

/* ------------------------------------------------------------ contours */

const NEIGHBOURS = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
]

/**
 * Moore-neighbour contour following with Jacob's stopping criterion: stop when
 * the start pixel is re-entered *from the same direction*, not merely revisited
 * — otherwise shapes that touch themselves terminate a loop early and lose half
 * the outline.
 */
function traceContour(bits, width, height, startX, startY, visited) {
  const at = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : bits[y * width + x])
  const contour = []

  let cx = startX
  let cy = startY
  let dir = 0
  let entryDir = -1
  let guard = 0
  const maxSteps = width * height * 4

  do {
    contour.push([cx, cy])
    visited[cy * width + cx] = 1

    let found = false
    // Resume the search just behind where we arrived, so the boundary is
    // followed rather than cutting across the interior.
    for (let i = 0; i < 8; i += 1) {
      const d = (dir + 6 + i) % 8
      const [dx, dy] = NEIGHBOURS[d]
      const nx = cx + dx
      const ny = cy + dy
      if (at(nx, ny)) {
        if (nx === startX && ny === startY && entryDir === d) return contour
        cx = nx
        cy = ny
        dir = d
        if (entryDir === -1) entryDir = d
        found = true
        break
      }
    }
    if (!found) return contour
    guard += 1
  } while (!(cx === startX && cy === startY) && guard < maxSteps)

  return contour
}

/** Perpendicular-distance simplification; `epsilon` is in pixels. */
function simplify(points, epsilon) {
  if (points.length < 3) return points

  let maxDist = 0
  let index = 0
  const [ax, ay] = points[0]
  const [bx, by] = points[points.length - 1]
  const dx = bx - ax
  const dy = by - ay
  const denom = Math.hypot(dx, dy) || 1

  for (let i = 1; i < points.length - 1; i += 1) {
    const [px, py] = points[i]
    const dist = Math.abs(dy * px - dx * py + bx * ay - by * ax) / denom
    if (dist > maxDist) {
      maxDist = dist
      index = i
    }
  }

  if (maxDist <= epsilon) return [points[0], points[points.length - 1]]
  return [
    ...simplify(points.slice(0, index + 1), epsilon).slice(0, -1),
    ...simplify(points.slice(index), epsilon),
  ]
}

/** Quadratic smoothing through midpoints — rounds the staircase off a traced edge. */
function toPathData(contours, smooth) {
  return contours
    .map((pts) => {
      if (pts.length < 3) return ''
      if (!smooth) {
        return `M${pts.map(([x, y]) => `${x} ${y}`).join('L')}Z`
      }
      const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      let d = `M${mid(pts[pts.length - 1], pts[0]).map(Math.round).join(' ')}`
      for (let i = 0; i < pts.length; i += 1) {
        const cur = pts[i]
        const next = pts[(i + 1) % pts.length]
        const m = mid(cur, next)
        d += `Q${cur[0]} ${cur[1]} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`
      }
      return `${d}Z`
    })
    .filter(Boolean)
    .join(' ')
}

/* -------------------------------------------------------------- public */

/**
 * @returns {{ pathData, width, height, viewBox, svg, contourCount, threshold }}
 */
export async function vectorize(file, options = {}) {
  const { threshold = null, invert = false, detail = 1.2, smooth = true, minArea = 12 } = options

  const imageData = await toImageData(file)
  const { bits, width, height, threshold: used } = binarise(imageData, { threshold, invert })

  const visited = new Uint8Array(width * height)
  const contours = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x
      if (!bits[i] || visited[i]) continue
      // Only start from a boundary pixel: one with empty space above it.
      if (y > 0 && bits[i - width]) continue

      const raw = traceContour(bits, width, height, x, y, visited)
      if (raw.length < 8) continue

      // Drop specks — scanner noise and JPEG artefacts trace as tiny loops.
      const xs = raw.map((p) => p[0])
      const ys = raw.map((p) => p[1])
      const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))
      if (area < minArea) continue

      contours.push(simplify(raw, detail))
    }
  }

  const pathData = toPathData(contours, smooth)
  const viewBox = `0 0 ${width} ${height}`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">` +
    `<path d="${pathData}" fill="currentColor" fill-rule="evenodd"/></svg>`

  return { pathData, width, height, viewBox, svg, contourCount: contours.length, threshold: used }
}
