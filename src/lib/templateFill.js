/**
 * Filling a creator's template with a subscriber's brand, in the browser.
 *
 * A template page is an SVG with named slots (see api/_lib/templateSvg.js for
 * the naming rules). Filling it is a pure transform of that SVG: the logo slot
 * becomes the traced mark, colour slots take the palette, text slots take the
 * brand's words, and an image slot takes a photo. Nothing is uploaded, so
 * re-colouring or swapping the font is instant and costs nothing.
 *
 * The result is drawn as an <img> of an SVG blob, not inlined into the page.
 * Illustrator and Figma exports style themselves with a <style> block, which
 * the site's CSP would block if inlined; as an image the SVG keeps its own
 * styling, can't run anything, and rasterises cleanly to PNG. The one cost is
 * that an SVG image can't load web fonts, so the brand font is embedded into
 * it as data.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'
const XLINK = 'http://www.w3.org/1999/xlink'

const LOGO = /^logo(?:$|[-_\s\d])/i
const COLOR = /^colou?r[-_\s]?(primary|secondary|accent|background|bg|text|dark|light)/i
const TEXT = /^(brand[-_\s]?name|tagline|website)(?:$|[-_\s\d])/i
const IMAGE = /^(image|photo)(?:$|[-_\s\d])/i

export const TEMPLATE_KINDS = [
  { id: 'social', label: 'Social media post', blurb: 'A post or story shaped for Instagram and friends.' },
  { id: 'logo-presentation', label: 'Logo presentation', blurb: 'The logo mocked up on cards, signs, shirts and screens.' },
  { id: 'identity', label: 'Visual identity deck', blurb: 'A whole deck walking through a brand.' },
]

/** Palette order in the Creative Suite: [dark, primary, secondary, light]. */
export function paletteRoles(palette) {
  const [dark, primary, secondary, light] = palette
  return {
    primary,
    secondary,
    accent: secondary,
    background: light,
    light,
    text: dark,
    dark,
  }
}

/* --------------------------------------------------------------- sanitise */

/**
 * Removes anything that could run or fetch. The server already refuses such
 * files; this is the second lock, because the SVG is about to be drawn.
 */
function sanitise(doc) {
  doc.querySelectorAll('script, foreignObject, iframe, object, embed').forEach((n) => n.remove())
  const walker = doc.createTreeWalker(doc.documentElement, 1 /* elements */)
  for (let el = walker.currentNode; el; el = walker.nextNode()) {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase()
      const value = attr.value.trim().toLowerCase()
      if (name.startsWith('on')) el.removeAttribute(attr.name)
      else if ((name === 'href' || name === 'xlink:href') && !(value.startsWith('data:image/') || value.startsWith('#'))) {
        el.removeAttribute(attr.name)
      }
    }
  }
  doc.querySelectorAll('style').forEach((s) => {
    s.textContent = s.textContent.replace(/@import[^;]+;/gi, '').replace(/url\(\s*['"]?(?:https?:)?\/\/[^)]*\)/gi, 'none')
  })
}

export function parseTemplate(svgText) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  if (doc.querySelector('parsererror') || doc.documentElement.nodeName.toLowerCase() !== 'svg') {
    throw new Error("That file isn't a valid SVG.")
  }
  sanitise(doc)
  return doc
}

/** Which slots a page has, for the upload form's live report. */
export function inspectPage(svgText) {
  const doc = parseTemplate(svgText)
  const slots = { logo: 0, colors: new Set(), text: new Set(), image: 0 }
  doc.querySelectorAll('[id]').forEach((el) => {
    const id = el.getAttribute('id')
    if (LOGO.test(id)) slots.logo += 1
    const c = COLOR.exec(id)
    if (c) slots.colors.add(c[1].toLowerCase() === 'bg' ? 'background' : c[1].toLowerCase())
    const t = TEXT.exec(id)
    if (t) slots.text.add(t[1].toLowerCase().replace(/[-_\s]/g, '') === 'brandname' ? 'brand-name' : t[1].toLowerCase())
    if (IMAGE.test(id)) slots.image += 1
  })
  const root = doc.documentElement
  const vb = (root.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number)
  return {
    width: parseFloat(root.getAttribute('width')) || vb[2] || 0,
    height: parseFloat(root.getAttribute('height')) || vb[3] || 0,
    logo: slots.logo,
    colors: [...slots.colors],
    text: [...slots.text],
    image: slots.image,
  }
}

/* ---------------------------------------------------------------- measure */

/**
 * Slot boxes in each slot's own coordinate space, measured by the browser.
 * The page is attached off-screen for a moment with its styling removed:
 * geometry doesn't depend on it, and inline styles would trip the CSP.
 */
function measureSlots(doc, ids) {
  const clone = doc.documentElement.cloneNode(true)
  clone.querySelectorAll('style').forEach((s) => s.remove())
  clone.querySelectorAll('[style]').forEach((n) => n.removeAttribute('style'))
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.className = 'tpl-measure'
  host.appendChild(document.importNode(clone, true))
  document.body.appendChild(host)
  const boxes = {}
  try {
    for (const id of ids) {
      const el = host.querySelector(`[id="${CSS.escape(id)}"]`)
      if (el && typeof el.getBBox === 'function') {
        const b = el.getBBox()
        boxes[id] = { x: b.x, y: b.y, width: b.width, height: b.height }
      }
    }
  } finally {
    host.remove()
  }
  return boxes
}

/* ------------------------------------------------------------------ fill */

function setFill(el, color) {
  // Inline style beats the classes in an exported <style> block.
  const paint = (node) => {
    const tag = node.nodeName.toLowerCase()
    if (['g', 'defs', 'clippath', 'mask', 'lineargradient', 'radialgradient', 'stop'].includes(tag)) return
    const fill = node.getAttribute('fill')
    if (fill === 'none') return
    node.style.setProperty('fill', color)
  }
  if (el.nodeName.toLowerCase() === 'g') el.querySelectorAll('*').forEach(paint)
  else paint(el)
}

function setText(el, value, fontFamily) {
  const tspans = el.querySelectorAll('tspan')
  if (tspans.length) {
    tspans[0].textContent = value
    ;[...tspans].slice(1).forEach((t) => t.remove())
  } else {
    el.textContent = value
  }
  if (fontFamily) {
    el.style.setProperty('font-family', `"${fontFamily}"`)
    el.querySelectorAll('tspan').forEach((t) => t.style.setProperty('font-family', `"${fontFamily}"`))
  }
}

function logoColour(id, roles) {
  if (/light|white|reverse/i.test(id)) return roles.light
  if (/dark|black/i.test(id)) return roles.dark
  if (/secondary|accent/i.test(id)) return roles.secondary
  return roles.primary
}

/**
 * Returns the filled page as SVG text.
 *
 * brand = { trace, name, tagline, website, palette, font, fontCss, photo }
 *   trace   the Creative Suite's traced mark ({ pathData, viewBox })
 *   photo   a data: URL for image slots, or null to leave them as designed
 *   fontCss @font-face rules with the font embedded, from embedFont()
 */
export function fillTemplate(svgText, brand) {
  const doc = parseTemplate(svgText)
  const roles = paletteRoles(brand.palette)
  const all = [...doc.querySelectorAll('[id]')]

  const logos = all.filter((el) => LOGO.test(el.id))
  const images = all.filter((el) => IMAGE.test(el.id))
  const boxes = measureSlots(doc, [...logos, ...images].map((el) => el.id))

  for (const el of all) {
    const c = COLOR.exec(el.id)
    if (c) setFill(el, roles[c[1].toLowerCase() === 'bg' ? 'background' : c[1].toLowerCase()])
    const t = TEXT.exec(el.id)
    if (t) {
      const role = t[1].toLowerCase().replace(/[-_\s]/g, '')
      const value = role === 'brandname' ? brand.name : role === 'tagline' ? brand.tagline : brand.website
      if (value) setText(el, value, brand.font)
    }
  }

  for (const el of logos) {
    const box = boxes[el.id]
    if (!box || !brand.trace) continue
    const g = doc.createElementNS(SVG_NS, 'g')
    const transform = el.getAttribute('transform')
    if (transform) g.setAttribute('transform', transform)
    const inner = doc.createElementNS(SVG_NS, 'svg')
    inner.setAttribute('x', box.x)
    inner.setAttribute('y', box.y)
    inner.setAttribute('width', box.width)
    inner.setAttribute('height', box.height)
    inner.setAttribute('viewBox', brand.trace.viewBox || `0 0 ${brand.trace.width} ${brand.trace.height}`)
    inner.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    const path = doc.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', brand.trace.pathData)
    path.setAttribute('fill-rule', 'evenodd')
    path.style.setProperty('fill', logoColour(el.id, roles))
    inner.appendChild(path)
    g.appendChild(inner)
    el.replaceWith(g)
  }

  for (const el of images) {
    const box = boxes[el.id]
    if (!box || !brand.photo) continue
    const img = doc.createElementNS(SVG_NS, 'image')
    img.setAttribute('x', box.x)
    img.setAttribute('y', box.y)
    img.setAttribute('width', box.width)
    img.setAttribute('height', box.height)
    img.setAttribute('preserveAspectRatio', 'xMidYMid slice')
    img.setAttribute('href', brand.photo)
    img.setAttributeNS(XLINK, 'xlink:href', brand.photo)
    const transform = el.getAttribute('transform')
    if (transform) img.setAttribute('transform', transform)
    el.replaceWith(img)
  }

  if (brand.fontCss) {
    const style = doc.createElementNS(SVG_NS, 'style')
    style.textContent = brand.fontCss
    doc.documentElement.insertBefore(style, doc.documentElement.firstChild)
  }

  return new XMLSerializer().serializeToString(doc)
}

/* ------------------------------------------------------------------ fonts */

const fontCache = new Map()

/**
 * The @font-face rules for a Google font with the files inlined as data URLs,
 * so the font still draws inside an SVG image. Resolves to '' on failure: the
 * text then falls back to a system face rather than breaking the page.
 */
export function embedFont(family) {
  if (!family) return Promise.resolve('')
  if (fontCache.has(family)) return fontCache.get(family)
  const job = (async () => {
    try {
      const url = `https://fonts.googleapis.com/css2?family=${family.trim().replace(/\s+/g, '+')}:wght@400;700&display=swap`
      let css = await (await fetch(url)).text()
      // Latin only: the full set of subsets would be megabytes for one page.
      const blocks = css.split('@font-face').filter((b) => /U\+0000-00FF/.test(b))
      css = blocks.map((b) => `@font-face${b}`).join('\n')
      const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]))]
      for (const u of urls) {
        const blob = await (await fetch(u)).blob()
        const data = await new Promise((resolve) => {
          const r = new FileReader()
          r.onload = () => resolve(r.result)
          r.readAsDataURL(blob)
        })
        css = css.split(u).join(data)
      }
      return css
    } catch {
      return ''
    }
  })()
  fontCache.set(family, job)
  return job
}

/* ---------------------------------------------------------------- output */

export function svgBlobUrl(svgText) {
  return URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }))
}

export function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(new Error("That photo couldn't be read."))
    r.readAsDataURL(file)
  })
}
