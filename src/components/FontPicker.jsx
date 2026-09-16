import { useEffect, useMemo, useRef, useState } from 'react'
import { GOOGLE_FONTS, FONT_CATEGORIES } from '../data/googleFonts'
import { ensureFont, fontStack, loadLocalFonts, supportsLocalFonts } from '../lib/fonts'

/**
 * Picks from the whole Google Fonts catalogue, plus the viewer's own installed
 * fonts where the browser allows it.
 *
 * Two things keep 1,946 rows workable. Only a slice is rendered — a long list
 * of DOM nodes is what makes a picker like this crawl — and each visible row
 * loads its own font lazily as it scrolls into view, so opening the list costs
 * one stylesheet per row you actually look at rather than 1,946 up front.
 */

const PAGE = 40

export default function FontPicker({ value, onChange, label = 'Typeface' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [shown, setShown] = useState(PAGE)
  const [local, setLocal] = useState([])
  const [localAsked, setLocalAsked] = useState(false)

  const wrapRef = useRef(null)
  const listRef = useRef(null)

  const all = useMemo(() => [...local, ...GOOGLE_FONTS], [local])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((f) => {
      if (category !== 'all' && f.category !== category) return false
      return !q || f.name.toLowerCase().includes(q)
    })
  }, [all, query, category])

  // The chosen font has to be loaded for the trigger to preview it.
  useEffect(() => {
    if (value) ensureFont(value)
  }, [value])

  useEffect(() => setShown(PAGE), [query, category])

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Each row asks for its own font only once it is actually on screen, and the
  // sentinel at the bottom pages the list in as you scroll.
  useEffect(() => {
    if (!open || !listRef.current) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target
          if (el.dataset.sentinel) {
            setShown((n) => (n < results.length ? n + PAGE : n))
          } else if (el.dataset.family && !el.dataset.loaded) {
            el.dataset.loaded = '1'
            ensureFont(el.dataset.family, { weights: [400] })
          }
        }
      },
      { root: listRef.current, rootMargin: '120px' }
    )
    listRef.current.querySelectorAll('[data-family],[data-sentinel]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [open, results, shown])

  async function askLocal() {
    setLocalAsked(true)
    const fonts = await loadLocalFonts()
    setLocal(fonts)
  }

  return (
    <div className="fp" ref={wrapRef}>
      <span className="fp-label">{label}</span>

      <button
        type="button"
        className="fp-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="fp-trigger-name" style={{ fontFamily: fontStack(value) }}>
          {value || 'Choose a font'}
        </span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="fp-panel" role="listbox">
          <div className="fp-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              autoFocus
              type="search"
              value={query}
              placeholder={`Search ${all.length.toLocaleString()} fonts…`}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="fp-cats">
            {FONT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={category === c.id ? 'fp-cat fp-cat-on' : 'fp-cat'}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
            {local.length > 0 && (
              <button
                type="button"
                className={category === 'local' ? 'fp-cat fp-cat-on' : 'fp-cat'}
                onClick={() => setCategory('local')}
              >
                On this device
              </button>
            )}
          </div>

          <div className="fp-list" ref={listRef}>
            {results.length === 0 && <p className="fp-empty">Nothing matches “{query}”.</p>}

            {results.slice(0, shown).map((f) => (
              <button
                key={`${f.local ? 'l' : 'g'}-${f.name}`}
                type="button"
                role="option"
                aria-selected={value === f.name}
                data-family={f.local ? undefined : f.name}
                className={value === f.name ? 'fp-row fp-row-on' : 'fp-row'}
                onClick={() => {
                  onChange(f.name)
                  setOpen(false)
                }}
              >
                <span className="fp-row-name" style={{ fontFamily: fontStack(f.name, f.category) }}>
                  {f.name}
                </span>
                <span className="fp-row-meta">{f.local ? 'installed' : f.category}</span>
              </button>
            ))}

            {shown < results.length && <div data-sentinel="1" className="fp-more">Loading more…</div>}
          </div>

          {supportsLocalFonts() && !localAsked && (
            <button type="button" className="fp-local" onClick={askLocal}>
              Also use the fonts installed on this device
            </button>
          )}
          {localAsked && local.length === 0 && (
            <p className="fp-foot">No local fonts found. Either permission was declined or there weren't any to show.</p>
          )}
        </div>
      )}
    </div>
  )
}
