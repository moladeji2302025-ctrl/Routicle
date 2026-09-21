/**
 * Font loading for the Creative Suite.
 *
 * 1,946 families is far too many to download, so nothing is fetched until a
 * family is actually previewed or picked. Each one gets a single stylesheet
 * link, injected once and remembered, and `document.fonts.load` is awaited so
 * callers know when it is safe to measure or rasterise with it.
 *
 * On Chromium the viewer's own installed fonts are offered too, via the Local
 * Font Access API. That needs an explicit permission prompt, so it is only
 * ever requested when someone asks for it — never on page load.
 */

const injected = new Map()

/** Google's CSS endpoint wants '+' for spaces. */
const cssName = (family) => family.trim().replace(/\s+/g, '+')

/**
 * Ensures a family is available to render with.
 *
 * Resolves either way: a family that fails to load is not worth blocking the
 * editor over, and the preview will simply fall back to the stack's next font.
 */
export function ensureFont(family, { weights = [400, 700], italics = [] } = {}) {
  if (!family || typeof document === 'undefined') return Promise.resolve(false)
  // Keyed by what was asked for, not just the family: a document that needs
  // Montserrat in five weights must not be answered by an earlier request for two.
  const key = `${family}|${weights.join(',')}|${italics.join(',')}`
  if (injected.has(key)) return injected.get(key)

  const promise = new Promise((resolve) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    let axis = ''
    if (italics.length) {
      // With an italic axis Google wants every tuple as ital,wght, sorted.
      const tuples = [...weights.map((w) => `0,${w}`), ...italics.map((w) => `1,${w}`)]
      axis = `:ital,wght@${tuples.join(';')}`
    } else if (weights.length > 1 || weights[0] !== 400) {
      // A single weight still needs its axis: without one Google serves 400 only.
      axis = `:wght@${[...weights].sort((a, b) => a - b).join(';')}`
    }
    link.href = `https://fonts.googleapis.com/css2?family=${cssName(family)}${axis}&display=swap`

    link.onload = async () => {
      try {
        // The stylesheet only declares the face; this is what actually fetches
        // the file and tells us it is ready to draw with.
        await Promise.all([
          ...weights.map((w) => document.fonts.load(`${w} 16px "${family}"`)),
          ...italics.map((w) => document.fonts.load(`italic ${w} 16px "${family}"`)),
        ])
        resolve(true)
      } catch {
        resolve(false)
      }
    }
    link.onerror = () => resolve(false)
    document.head.appendChild(link)
  })

  injected.set(key, promise)
  return promise
}

/** A CSS font stack for a family, with a sane fallback for its category. */
export function fontStack(family, category = 'sans') {
  const fallback = {
    serif: 'Georgia, serif',
    mono: 'ui-monospace, monospace',
    script: 'cursive',
    display: 'system-ui, sans-serif',
    sans: 'system-ui, sans-serif',
  }[category] || 'system-ui, sans-serif'
  return family ? `'${family}', ${fallback}` : fallback
}

/* --------------------------------------------------------- local fonts --- */

export const supportsLocalFonts = () =>
  typeof window !== 'undefined' && typeof window.queryLocalFonts === 'function'

/**
 * The fonts installed on this machine, once the viewer allows it.
 *
 * Returns families, not faces: `queryLocalFonts` lists every style separately
 * (Regular, Bold, Italic…) and the picker wants one row per family.
 */
export async function loadLocalFonts() {
  if (!supportsLocalFonts()) return []
  try {
    const faces = await window.queryLocalFonts()
    const families = new Map()
    for (const face of faces) {
      if (!families.has(face.family)) {
        families.set(face.family, { name: face.family, category: 'local', weights: [400, 700], local: true })
      }
    }
    return [...families.values()].sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    // Permission refused, or the prompt was dismissed. Not an error worth
    // surfacing — the Google catalogue is still there.
    return []
  }
}
