import { Fragment } from 'react'

/**
 * Renders the same light markup the newsletter uses, as React elements rather
 * than HTML, so nothing an author types can run:
 *
 *   # Heading              a sub-heading (## and ### too)
 *   - item                 a bullet (consecutive lines make one list)
 *   > quote                a pull quote
 *   **bold**  [text](url)  inline
 *   a blank line           starts a new paragraph
 */

const SAFE_URL = /^(https?:\/\/|mailto:|\/(?!\/))/i

function inline(text, keyBase) {
  const out = []
  // Bold and links, in one pass over the text.
  const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g
  let last = 0
  let m
  let i = 0
  while ((m = pattern.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1] !== undefined) {
      out.push(<strong key={`${keyBase}-${i}`}>{m[1]}</strong>)
    } else if (SAFE_URL.test(m[3])) {
      const external = /^https?:/i.test(m[3])
      out.push(
        <a
          key={`${keyBase}-${i}`}
          href={m[3]}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {m[2]}
        </a>
      )
    } else {
      out.push(m[2])
    }
    last = m.index + m[0].length
    i += 1
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export default function RichText({ source, className = 'rich' }) {
  const chunks = String(source || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((c) => c.split('\n').filter((l) => l.trim() !== ''))
    .filter((lines) => lines.length)

  return (
    <div className={className}>
      {chunks.map((lines, i) => {
        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*]\s+/, ''), `${i}-${j}`)}</li>
              ))}
            </ul>
          )
        }
        const heading = lines.length === 1 && lines[0].match(/^(#{1,3})\s+(.*)$/)
        if (heading) {
          const Tag = heading[1].length === 1 ? 'h2' : 'h3'
          return <Tag key={i}>{heading[2]}</Tag>
        }
        if (lines.every((l) => /^\s*>\s?/.test(l))) {
          return <blockquote key={i}>{inline(lines.map((l) => l.replace(/^\s*>\s?/, '')).join(' '), `${i}`)}</blockquote>
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l, `${i}-${j}`)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}
