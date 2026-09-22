/**
 * Colour science for the Creative Suite's palette tools: theory-driven
 * palette generation from one brand colour, WCAG contrast checking, and
 * palette extraction from a reference photo (k-means, client-side).
 *
 * Every palette here keeps the same shape the rest of the suite already
 * assumes (logoPack.js, PALETTE_PRESETS): four hex strings, darkest to
 * lightest — [ink, accent, soft, paper] — so a generated or extracted
 * palette drops straight into the existing picker with no adapter.
 */

/* ------------------------------------------------------------- conversion */

export function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
  if (!m) return { r: 0, g: 0, b: 0 }
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
}

export function rgbToHex({ r, g, b }) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function rgbToHsl({ r, g, b }) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return { h: h * 60, s, l }
}

export function hslToRgb({ h, s, l }) {
  h = ((h % 360) + 360) % 360 / 360
  if (s === 0) {
    const v = l * 255
    return { r: v, g: v, b: v }
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue = (t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return { r: hue(h + 1 / 3) * 255, g: hue(h) * 255, b: hue(h - 1 / 3) * 255 }
}

/* --------------------------------------------------------- WCAG contrast */

/** 0 (black) to 1 (white), the WCAG way — gamma-corrected, not a straight average. */
export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  const lin = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** The ratio WCAG defines contrast by: 1 (identical) to 21 (black on white). */
export function contrastRatio(hexA, hexB) {
  const a = relativeLuminance(hexA)
  const b = relativeLuminance(hexB)
  const [lighter, darker] = a > b ? [a, b] : [b, a]
  return (lighter + 0.05) / (darker + 0.05)
}

/** Which WCAG levels a pair passes, for normal-size and for large (18pt+/14pt+bold) text. */
export function wcagLevels(hexA, hexB) {
  const ratio = contrastRatio(hexA, hexB)
  return {
    ratio,
    normal: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : null,
    large: ratio >= 4.5 ? 'AAA' : ratio >= 3 ? 'AA' : null,
  }
}

/* ------------------------------------------------------- theory palettes */

const round = (hsl) => ({ h: hsl.h, s: hsl.s, l: hsl.l })

/**
 * One brand colour, one colour-theory relationship, one four-step palette —
 * always shaped [ink, accent, soft, paper] like the rest of the suite.
 * `accent` keeps the seed colour's own hue exactly; the other three are
 * built from it and from the theory relationship, not sampled arbitrarily.
 */
export function theoryPalette(seedHex, scheme = 'complementary') {
  const seed = rgbToHsl(hexToRgb(seedHex))
  const accent = seedHex.toLowerCase()

  const at = (h, s, l) => rgbToHex(hslToRgb(round({ h, s, l })))

  let related
  if (scheme === 'complementary') related = at(seed.h + 180, seed.s, Math.max(0.3, seed.l - 0.12))
  else if (scheme === 'triadic') related = at(seed.h + 120, seed.s, seed.l)
  else if (scheme === 'analogous') related = at(seed.h + 30, seed.s, seed.l)
  else related = at(seed.h, Math.max(0, seed.s - 0.25), Math.max(0.25, seed.l - 0.2)) // monochrome

  // Ink and paper are always near-black / near-white, tinted just enough with
  // the seed's own hue to feel chosen rather than generic — a pure #000/#fff
  // pair reads as a missing palette, not a monochrome one.
  const ink = at(seed.h, Math.min(0.35, seed.s * 0.6), 0.09)
  const paper = at(seed.h, Math.min(0.25, seed.s * 0.35), 0.97)

  return [ink, accent, related, paper]
}

export const THEORY_SCHEMES = [
  { id: 'complementary', label: 'Complementary', blurb: 'Opposite on the wheel — the most contrast.' },
  { id: 'triadic', label: 'Triadic', blurb: 'Three points evenly spaced — vivid, balanced.' },
  { id: 'analogous', label: 'Analogous', blurb: 'Neighbours on the wheel — calm, cohesive.' },
  { id: 'monochrome', label: 'Monochrome', blurb: 'One hue, stepped in shade — quiet and controlled.' },
]

/* -------------------------------------------------- extraction from a photo */

/**
 * The dominant colours in an image, by k-means over its pixels (downsampled
 * for speed — a few thousand samples cluster just as well as every pixel and
 * run in milliseconds). Returned darkest to lightest, so it drops straight
 * into the same [ink, accent, soft, paper] slot as a theory palette.
 */
export function extractPaletteFromImage(file, k = 4) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const SIZE = 120 // downsample: enough signal, none of the cost
        const canvas = document.createElement('canvas')
        canvas.width = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, SIZE, SIZE)
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE)

        const points = []
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue // skip transparent pixels
          points.push([data[i], data[i + 1], data[i + 2]])
        }
        URL.revokeObjectURL(url)
        if (points.length < k) return reject(new Error('That image is too small or too uniform to pull a palette from.'))

        resolve(kMeansHexes(points, k))
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image'))
    }
    img.src = url
  })
}

function kMeansHexes(points, k) {
  // Seed centroids from evenly-spaced samples rather than random picks, so
  // the result is the same every time for the same image.
  const step = Math.floor(points.length / k)
  let centroids = Array.from({ length: k }, (_, i) => points[Math.min(points.length - 1, i * step)].slice())

  for (let iter = 0; iter < 12; iter += 1) {
    const buckets = Array.from({ length: k }, () => [])
    for (const p of points) {
      let best = 0
      let bestDist = Infinity
      for (let c = 0; c < k; c += 1) {
        const d = (p[0] - centroids[c][0]) ** 2 + (p[1] - centroids[c][1]) ** 2 + (p[2] - centroids[c][2]) ** 2
        if (d < bestDist) {
          bestDist = d
          best = c
        }
      }
      buckets[best].push(p)
    }
    let moved = false
    centroids = centroids.map((c, i) => {
      const bucket = buckets[i]
      if (!bucket.length) return c
      const next = [0, 1, 2].map((ch) => bucket.reduce((sum, p) => sum + p[ch], 0) / bucket.length)
      if (Math.abs(next[0] - c[0]) + Math.abs(next[1] - c[1]) + Math.abs(next[2] - c[2]) > 1) moved = true
      return next
    })
    if (!moved) break
  }

  return centroids
    .map(([r, g, b]) => rgbToHex({ r, g, b }))
    .sort((a, b) => relativeLuminance(a) - relativeLuminance(b))
}
