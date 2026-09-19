/**
 * What makes an upload a usable Creative Suite template, checked on the server.
 *
 * A template is an empty frame for someone else's brand: an SVG page (or a
 * deck of them, one file per page) with named places for the subscriber's
 * logo, colours and words. The names are ordinary layer names in Illustrator
 * or Figma, which both export a layer's name as the element's id:
 *
 *   logo…                      where the logo goes (logo-light / logo-dark for
 *                              a white or dark version); required
 *   color-primary / -secondary / -accent / -background / -text
 *                              shapes recoloured with the brand palette; at
 *                              least one required
 *   brand-name, tagline, website
 *                              text replaced with the brand's own; optional
 *   image…                     a box filled with a photo or an AI image;
 *                              optional
 *
 * This is the constraint that makes a template honest: a finished design with
 * no named slots can't be filled with anyone's brand, so it isn't one.
 *
 * The same SVG is later drawn in subscribers' browsers, so anything that could
 * run or fetch is refused here outright, not quietly stripped: a creator
 * should know their file was changed. (The browser sanitises again anyway.)
 */

export const MAX_TEMPLATE_PAGE_BYTES = 5 * 1024 * 1024
export const MAX_TEMPLATE_PAGES = 12
export const TEMPLATE_KINDS = ['social', 'logo-presentation', 'identity']

const SLOT_PATTERNS = {
  logo: /^logo(?:$|[-_\s\d])/i,
  color: /^colou?r[-_\s]?(primary|secondary|accent|background|bg|text|dark|light)/i,
  text: /^(brand[-_\s]?name|tagline|website)(?:$|[-_\s\d])/i,
  image: /^(image|photo)(?:$|[-_\s\d])/i,
}

const FORBIDDEN = [
  { re: /<script[\s>]/i, why: 'it contains a script' },
  { re: /<foreignObject[\s>]/i, why: 'it embeds HTML (foreignObject)' },
  { re: /<(iframe|object|embed)[\s>]/i, why: 'it embeds another document' },
  { re: /\son[a-z]+\s*=/i, why: 'it has event handlers (onload, onclick…)' },
  { re: /javascript:/i, why: 'it contains a javascript: link' },
  { re: /(?:xlink:)?href\s*=\s*["']\s*(?:https?:)?\/\//i, why: 'it links to files on the internet; embed images instead' },
  { re: /@import/i, why: 'its styles import from elsewhere' },
  { re: /<!ENTITY/i, why: 'it declares XML entities' },
]

/** Reads the page size from width/height, falling back to the viewBox. */
function pageSize(text) {
  const root = /<svg\b[^>]*>/i.exec(text)?.[0] || ''
  const num = (name) => {
    const m = new RegExp(`\\s${name}\\s*=\\s*["']\\s*([\\d.]+)`, 'i').exec(root)
    return m ? Number(m[1]) : null
  }
  const vb = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(root)
  const width = num('width') || (vb ? Number(vb[1]) : null)
  const height = num('height') || (vb ? Number(vb[2]) : null)
  return { width, height }
}

/**
 * Checks one page. Returns { ok: true, width, height, slots } or
 * { ok: false, error }.
 */
export function inspectTemplatePage(text) {
  if (typeof text !== 'string' || !/<svg[\s>]/i.test(text)) {
    return { ok: false, error: "isn't an SVG file" }
  }
  if (/<html[\s>]/i.test(text)) return { ok: false, error: 'is a web page, not an SVG' }
  for (const f of FORBIDDEN) {
    if (f.re.test(text)) return { ok: false, error: `can't be used because ${f.why}` }
  }

  const ids = [...text.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1])
  const slots = { logo: 0, colors: [], text: [], image: 0 }
  for (const id of ids) {
    if (SLOT_PATTERNS.logo.test(id)) slots.logo += 1
    const c = SLOT_PATTERNS.color.exec(id)
    if (c) {
      const role = c[1].toLowerCase() === 'bg' ? 'background' : c[1].toLowerCase()
      if (!slots.colors.includes(role)) slots.colors.push(role)
    }
    const t = SLOT_PATTERNS.text.exec(id)
    if (t) {
      const role = t[1].toLowerCase().replace(/[-_\s]/g, '') === 'brandname' ? 'brand-name' : t[1].toLowerCase()
      if (!slots.text.includes(role)) slots.text.push(role)
    }
    if (SLOT_PATTERNS.image.test(id)) slots.image += 1
  }

  const { width, height } = pageSize(text)
  if (!width || !height) return { ok: false, error: 'has no size (set width and height, or a viewBox)' }
  return { ok: true, width, height, slots }
}

/**
 * Checks a whole template, every page, and returns the manifest stored with
 * it, or the first reason it can't be used.
 */
export function inspectTemplate(pages) {
  if (!pages.length) return { ok: false, error: 'A template needs at least one SVG page.' }
  if (pages.length > MAX_TEMPLATE_PAGES) return { ok: false, error: `A template can have up to ${MAX_TEMPLATE_PAGES} pages.` }

  const out = []
  for (let i = 0; i < pages.length; i += 1) {
    const r = inspectTemplatePage(pages[i])
    if (!r.ok) return { ok: false, error: `Page ${i + 1} ${r.error}.` }
    out.push({ width: r.width, height: r.height, slots: r.slots })
  }

  const logo = out.reduce((n, p) => n + p.slots.logo, 0)
  const colors = [...new Set(out.flatMap((p) => p.slots.colors))]
  if (!logo) {
    return { ok: false, error: 'There is no logo slot. Name the layer where the logo goes "logo" before exporting.' }
  }
  if (!colors.length) {
    return {
      ok: false,
      error: 'There are no colour slots. Name at least one layer "color-primary" (or -secondary, -accent, -background) so it takes the brand colour.',
    }
  }
  return {
    ok: true,
    manifest: {
      pages: out,
      summary: {
        pages: out.length,
        logo,
        colors,
        text: [...new Set(out.flatMap((p) => p.slots.text))],
        image: out.reduce((n, p) => n + p.slots.image, 0),
      },
    },
  }
}
