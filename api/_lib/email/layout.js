/**
 * One look for every email Routicle sends.
 *
 * An email is described as a list of blocks, and this turns the same list into
 * both the HTML and the plain-text body. Sending both matters: a lone HTML body
 * scores badly with spam filters, and some clients show only the text.
 *
 *   { p: 'A paragraph.' }
 *   { h: 'A sub-heading' }
 *   { list: ['one', 'two'] }
 *   { button: { label: 'Open it', url: 'https://…' } }
 *   { code: '482913' }
 *   { facts: [['Plan', 'Standard'], ['Amount', '₦12,000']] }
 *   { quote: 'Something someone wrote, shown set apart.' }
 *   { note: 'Small print.' }
 *
 * Markup is inline styles on plain elements, no images and no web fonts: many
 * clients block remote images by default, and a layout that depends on one
 * arrives looking broken.
 */

const BRAND = '#6750de'
const INK = '#16161a'
const MUTED = '#5a5a63'
const FAINT = '#8a8a94'
const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

/** Only links that can't run anything. */
export function safeUrl(url) {
  const u = String(url || '').trim()
  return /^(https?:\/\/|mailto:)/i.test(u) ? u : ''
}

export function appBase() {
  return (process.env.APP_URL || 'https://routicle.vercel.app').replace(/\/$/, '')
}

/* --------------------------------------------------------------- blocks */

function blockHtml(b) {
  if (b.h) {
    return `<h2 style="margin:26px 0 8px;font-size:16px;line-height:1.35;font-weight:700;color:${INK}">${escapeHtml(b.h)}</h2>`
  }
  if (b.p != null) {
    return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${MUTED}">${b.raw ? b.p : escapeHtml(b.p)}</p>`
  }
  if (b.list) {
    const items = b.list
      .map((i) => `<li style="margin:0 0 6px">${b.raw ? i : escapeHtml(i)}</li>`)
      .join('')
    return `<ul style="margin:0 0 16px;padding:0 0 0 20px;font-size:15px;line-height:1.6;color:${MUTED}">${items}</ul>`
  }
  if (b.button) {
    const url = safeUrl(b.button.url)
    if (!url) return ''
    return `<p style="margin:8px 0 22px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:${BRAND};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">${escapeHtml(b.button.label)}</a></p>`
  }
  if (b.code) {
    return `<p style="margin:0 0 20px;padding:16px 0;border-radius:14px;background:#f2f1fb;text-align:center;font-size:32px;font-weight:700;letter-spacing:0.3em;color:${INK}">${escapeHtml(b.code)}</p>`
  }
  if (b.facts) {
    const rows = b.facts
      .filter((f) => f[1] != null && f[1] !== '')
      .map(
        ([k, v]) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid #eeeef3;font-size:13px;color:${FAINT}">${escapeHtml(k)}</td><td style="padding:8px 0;border-bottom:1px solid #eeeef3;font-size:14px;font-weight:600;color:${INK};text-align:right">${escapeHtml(v)}</td></tr>`
      )
      .join('')
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse">${rows}</table>`
  }
  if (b.quote) {
    return `<blockquote style="margin:0 0 18px;padding:2px 0 2px 14px;border-left:3px solid ${BRAND};font-size:15px;line-height:1.6;color:${INK}">${escapeHtml(b.quote)}</blockquote>`
  }
  if (b.note) {
    return `<p style="margin:0 0 12px;font-size:12px;line-height:1.6;color:${FAINT}">${escapeHtml(b.note)}</p>`
  }
  if (b.link) {
    const url = safeUrl(b.link)
    if (!url) return ''
    return `<p style="margin:0 0 12px;font-size:12px;line-height:1.6;color:${FAINT}">Or paste this into your browser:<br /><span style="color:${BRAND};word-break:break-all">${escapeHtml(url)}</span></p>`
  }
  return ''
}

function blockText(b) {
  if (b.h) return `\n${b.h.toUpperCase()}`
  if (b.p != null) return b.raw ? htmlToText(b.p) : b.p
  if (b.list) return b.list.map((i) => `• ${b.raw ? htmlToText(i) : i}`).join('\n')
  if (b.button) return `${b.button.label}: ${safeUrl(b.button.url)}`
  if (b.code) return `Your code: ${b.code}`
  if (b.facts) return b.facts.filter((f) => f[1] != null && f[1] !== '').map(([k, v]) => `${k}: ${v}`).join('\n')
  if (b.quote) return `> ${b.quote}`
  if (b.note) return b.note
  if (b.link) return safeUrl(b.link)
  return ''
}

function htmlToText(html) {
  return String(html)
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_, href, label) => (label === href ? href : `${label} (${href})`))
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/* --------------------------------------------------------------- render */

/**
 * @param heading      the large line at the top
 * @param preheader    the preview text some clients show beside the subject
 * @param blocks       see the top of this file
 * @param unsubscribeUrl  when set, adds the unsubscribe line (marketing only)
 * @param reason       why this person is getting it, for the footer
 */
export function renderEmail({ heading, preheader = '', blocks = [], unsubscribeUrl = '', reason = '' }) {
  const body = blocks.map(blockHtml).join('\n')

  const footerLines = [
    reason && escapeHtml(reason),
    unsubscribeUrl &&
      `<a href="${escapeHtml(unsubscribeUrl)}" style="color:${FAINT};text-decoration:underline">Unsubscribe</a>`,
  ].filter(Boolean)

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fc">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}${'&nbsp;'.repeat(40)}</div>
<div style="font-family:${FONT};max-width:520px;margin:0 auto;padding:32px 24px;color:${INK};background:#ffffff">
  <p style="margin:0 0 24px;font-size:18px;font-weight:700;letter-spacing:-0.01em;color:${INK}">Routicle</p>
  <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-0.02em;color:${INK}">${escapeHtml(heading)}</h1>
${body}
  <p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #eeeef3;font-size:12px;line-height:1.6;color:${FAINT}">${footerLines.join('<br />') || 'Routicle'}</p>
</div>
</body>
</html>`

  const text = [
    heading,
    '',
    ...blocks.map(blockText).filter((t) => t !== ''),
    '',
    '—',
    reason,
    unsubscribeUrl && `Unsubscribe: ${unsubscribeUrl}`,
  ]
    .filter((line, i, all) => line !== false && line !== undefined && line !== null && !(line === '' && all[i - 1] === ''))
    .join('\n')

  return { html, text }
}

/* ------------------------------------------------------- newsletter body */

/**
 * The newsletter is written as plain text with a little markup, so whoever
 * sends it can't break the layout or paste in anything that runs:
 *
 *   # Heading              a sub-heading
 *   - item                 a bullet (consecutive lines make one list)
 *   **bold**  [text](url)  inline
 *   a blank line           starts a new paragraph
 *
 * Everything is escaped first, then the markup is applied to the result, so
 * the only HTML that can appear is what this function itself writes.
 */
export function markdownLite(source) {
  const inline = (s) =>
    escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#16161a">$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
        const clean = safeUrl(url.replace(/&amp;/g, '&'))
        return clean
          ? `<a href="${escapeHtml(clean)}" style="color:${BRAND};text-decoration:underline">${label}</a>`
          : label
      })

  const blocks = []
  let list = null
  const flush = () => {
    if (list) {
      blocks.push({ list: list.map(inline), raw: true })
      list = null
    }
  }

  for (const chunk of String(source || '').replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const lines = chunk.split('\n').filter((l) => l.trim() !== '')
    if (!lines.length) continue
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      flush()
      blocks.push({ list: lines.map((l) => inline(l.replace(/^\s*[-*]\s+/, ''))), raw: true })
    } else if (/^#{1,3}\s+/.test(lines[0]) && lines.length === 1) {
      flush()
      blocks.push({ h: lines[0].replace(/^#{1,3}\s+/, '') })
    } else {
      flush()
      blocks.push({ p: lines.map(inline).join('<br />'), raw: true })
    }
  }
  flush()
  return blocks
}
