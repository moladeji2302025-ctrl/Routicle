/**
 * What an uploaded file actually is, decided from its own bytes.
 *
 * The browser sends a filename and a MIME type, and both are claims: renaming
 * `setup.exe` to `brand-deck.psd` changes the extension and, on most systems,
 * the reported type too. The first few bytes of a file are not so easily
 * faked, because the program that opens it depends on them. So every upload is
 * checked against its real signature, and the extension and declared type are
 * used only to reject obvious mismatches early, before any bytes are sent.
 */

/** Everything a signature can be identified as. */
export const TYPES = {
  jpeg: { label: 'JPEG image', ext: '.jpg' },
  png: { label: 'PNG image', ext: '.png' },
  webp: { label: 'WebP image', ext: '.webp' },
  mp4: { label: 'MP4 video', ext: '.mp4' },
  psd: { label: 'Photoshop document', ext: '.psd' },
  psb: { label: 'Photoshop large document', ext: '.psb' },
  pdf: { label: 'PDF (Illustrator or Canva export)', ext: '.pdf' },
  eps: { label: 'EPS', ext: '.eps' },
  aep: { label: 'After Effects project', ext: '.aep' },
  gzip: { label: 'Premiere Pro project', ext: '.prproj' },
  fig: { label: 'Figma file', ext: '.fig' },
  zip: { label: 'ZIP archive', ext: '.zip' },
  svg: { label: 'SVG', ext: '.svg' },
  // Recognised only so the refusal can say what the file really is.
  exe: { label: 'Windows program', dangerous: true },
  elf: { label: 'Linux program', dangerous: true },
  macho: { label: 'macOS program', dangerous: true },
  script: { label: 'script', dangerous: true },
  html: { label: 'web page', dangerous: true },
}

const ascii = (bytes, start, length) =>
  String.fromCharCode(...bytes.subarray(start, start + length))

const startsWith = (bytes, signature, offset = 0) =>
  signature.every((b, i) => bytes[offset + i] === b)

// Image brands that also use an ftyp box, which must not pass as MP4 video.
const IMAGE_FTYP_BRANDS = new Set(['heic', 'heix', 'hevc', 'mif1', 'msf1', 'avif', 'avis'])

/**
 * Identifies a file from its first bytes. Needs at least 16; 64 is plenty.
 * Returns a key of TYPES, or null when the signature is not one we know.
 */
export function detectType(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || [])
  if (bytes.length < 4) return null

  // Executables and scripts first, so a disguised one is named for what it is.
  if (startsWith(bytes, [0x4d, 0x5a])) return 'exe' // MZ
  if (startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46])) return 'elf'
  if (
    startsWith(bytes, [0xfe, 0xed, 0xfa, 0xce]) ||
    startsWith(bytes, [0xfe, 0xed, 0xfa, 0xcf]) ||
    startsWith(bytes, [0xce, 0xfa, 0xed, 0xfe]) ||
    startsWith(bytes, [0xcf, 0xfa, 0xed, 0xfe]) ||
    startsWith(bytes, [0xca, 0xfe, 0xba, 0xbe])
  ) {
    return 'macho'
  }
  if (startsWith(bytes, [0x23, 0x21])) return 'script' // #!

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp'

  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4).toLowerCase()
    return IMAGE_FTYP_BRANDS.has(brand) ? null : 'mp4'
  }

  // PSD and PSB share a signature and differ by version number.
  if (ascii(bytes, 0, 4) === '8BPS') {
    const version = (bytes[4] << 8) | bytes[5]
    return version === 2 ? 'psb' : version === 1 ? 'psd' : null
  }

  // Modern .ai files are PDF-compatible, and Canva exports PDF too.
  if (ascii(bytes, 0, 5) === '%PDF-') return 'pdf'
  if (ascii(bytes, 0, 4) === '%!PS' || startsWith(bytes, [0xc5, 0xd0, 0xd3, 0xc6])) return 'eps'

  // After Effects projects are a big-endian RIFF container with an "Egg!" form.
  if (ascii(bytes, 0, 4) === 'RIFX' && ascii(bytes, 8, 4) === 'Egg!') return 'aep'

  // A .prproj is gzip-compressed XML.
  if (startsWith(bytes, [0x1f, 0x8b])) return 'gzip'

  if (ascii(bytes, 0, 8) === 'fig-kiwi') return 'fig'
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return 'zip'

  const head = ascii(bytes, 0, Math.min(bytes.length, 64)).replace(/^\uFEFF|^\xEF\xBB\xBF/, '').trimStart().toLowerCase()
  if (head.startsWith('<!doctype html') || head.startsWith('<html') || head.startsWith('<script')) return 'html'
  // An SVG is text, so its first bytes only say "XML" or "svg". That is enough
  // to route it: every template page is then read in full and checked by
  // templateSvg.js before it is accepted.
  if (head.startsWith('<svg') || head.startsWith('<?xml') || head.startsWith('<!-- generator') || head.startsWith('<!doctype svg')) return 'svg'

  return null
}

/* ------------------------------------------------------------ allowlists */

const MB = 1024 ** 2

/**
 * What each upload slot accepts: the real types, the extensions a file may
 * arrive with, and the largest it may be. Source formats are keyed by the
 * format the creator ticked, so a file attached as "PSD" must actually be one.
 */
export const RULES = {
  thumbnail: { types: ['jpeg', 'png'], exts: ['.jpg', '.jpeg', '.png'], maxBytes: 15 * MB, name: 'thumbnail' },
  'thumbnail-webp': { types: ['webp'], exts: ['.webp'], maxBytes: 8 * MB, name: 'WebP thumbnail' },
  preview: { types: ['mp4'], exts: ['.mp4', '.m4v'], maxBytes: 250 * MB, name: 'preview clip' },
}

export const SOURCE_RULES = {
  PSD: { types: ['psd', 'psb'], exts: ['.psd', '.psb'], name: 'Photoshop file' },
  AI: { types: ['pdf', 'eps'], exts: ['.ai', '.eps', '.pdf'], name: 'Illustrator file' },
  Canva: { types: ['pdf', 'png', 'jpeg', 'zip', 'mp4'], exts: ['.pdf', '.png', '.jpg', '.jpeg', '.zip', '.mp4'], name: 'Canva export' },
  AEP: { types: ['aep'], exts: ['.aep', '.aet'], name: 'After Effects project' },
  PPRO: { types: ['gzip'], exts: ['.prproj'], name: 'Premiere Pro project' },
  Figma: { types: ['fig'], exts: ['.fig'], name: 'Figma file' },
  // One page of a Creative Suite template. Only accepted on template uploads.
  SVG: { types: ['svg'], exts: ['.svg'], name: 'SVG template page', maxBytes: 5 * MB },
}

/** The rule for an upload slot, or null when the slot or format is unknown. */
export function ruleFor(kind, format) {
  if (kind === 'source') {
    const rule = SOURCE_RULES[format]
    return rule ? { ...rule, maxBytes: rule.maxBytes || null } : null
  }
  return RULES[kind] || null
}

export function extensionOf(fileName) {
  const match = /\.[a-z0-9]{1,8}$/i.exec(String(fileName || ''))
  return match ? match[0].toLowerCase() : ''
}

/**
 * The display name kept alongside a stored file. Stored objects are named by a
 * generated id and never by this; it exists only so a creator sees their own
 * filename. Path separators and control characters are stripped because it is
 * shown in the UI and used in a download's suggested name.
 */
export function displayName(fileName) {
  return String(fileName || 'file')
    .replace(/[\\/]/g, '-')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 180) || 'file'
}

const withArticle = (noun) => `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`

/** Plain-language refusal, naming what the file really is when we can tell. */
export function mismatchMessage(rule, detected) {
  const expected = withArticle(rule.name)
  if (!detected) return `That file doesn't look like a real ${rule.name}. Its contents don't match any format we accept.`
  const actual = withArticle(TYPES[detected].label)
  if (TYPES[detected].dangerous) return `That file is ${actual}, not ${expected}. Programs and scripts can't be uploaded.`
  return `That file is ${actual}, not ${expected}.`
}
