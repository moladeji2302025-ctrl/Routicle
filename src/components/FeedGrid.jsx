import { useEffect, useMemo, useRef, useState } from 'react'
import FeedCard from './FeedCard'
import Reveal from './Reveal'
import { useApp } from '../context/AppContext'

// Settings > Appearance > Grid density shifts the column count at every
// breakpoint, so "compact" genuinely fits more work on the same screen.
const DENSITY_OFFSET = { compact: 1, comfortable: 0, spacious: -1 }

function columnCountFor(width, offset = 0) {
  let base
  if (width <= 520) base = 1
  else if (width <= 780) base = 2
  else if (width <= 1100) base = 3
  else base = 5
  return Math.max(1, base + offset)
}

/**
 * A real (shortest-column-first) masonry, not CSS `column-count`. CSS columns
 * fill straight down column 1, then column 2, etc, with no awareness of how
 * tall any other column ended up — so the last row is always ragged.
 *
 * Renders a stable round-robin layout — not a greedy recompute — until every
 * card's image has actually finished loading, then does the real
 * shortest-column placement exactly once, for the final settled layout.
 * Two things this deliberately avoids, both of which cause a card to move
 * to a *different* column mid-load (forcing React to unmount it from the
 * old column and remount it in the new one, restarting its image load —
 * under a slow/real network that cascades and the grid never settles):
 *   1. Recomputing greedy placement on every partial height update, rather
 *      than once at the end.
 *   2. Treating "ResizeObserver has fired at least once" as "measured" — an
 *      <img> with no set dimensions collapses to ~0 height *before* it has
 *      loaded, so the observer fires immediately with a bogus height, and
 *      "measured" would flip true well before the images are actually in.
 *      Real completion is tracked from each <img>'s own load/error event.
 */
export default function FeedGrid({ items }) {
  const { settings } = useApp()
  const offset = DENSITY_OFFSET[settings.appearance.density] ?? 0
  const [columnCount, setColumnCount] = useState(() => columnCountFor(window.innerWidth, offset))
  const [heights, setHeights] = useState({})
  const [loadedIds, setLoadedIds] = useState(() => new Set())
  const roRef = useRef(null)
  const elementsRef = useRef(new Map()) // itemId -> wrapper element currently being observed

  useEffect(() => {
    function onResize() {
      setColumnCount(columnCountFor(window.innerWidth, offset))
    }
    onResize() // also re-runs when the density setting changes
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [offset])

  // One shared observer for every card, rather than one per card recreated
  // on every render — cards' ref callbacks below stay referentially stable
  // (cached per item id) so attaching/observing only happens on real mount.
  useEffect(() => {
    roRef.current = new ResizeObserver((entries) => {
      setHeights((prev) => {
        let changed = false
        const next = { ...prev }
        for (const entry of entries) {
          const itemId = entry.target.dataset.itemId
          const h = entry.contentRect.height
          if (h && next[itemId] !== h) {
            next[itemId] = h
            changed = true
          }
        }
        return changed ? next : prev
      })
    })
    // Anything that mounted (and registered itself in elementsRef) before this
    // effect ran — refs attach during commit, before effects — needs picking up now.
    elementsRef.current.forEach((el) => roRef.current.observe(el))
    return () => roRef.current.disconnect()
  }, [])

  function markLoaded(itemId) {
    setLoadedIds((prev) => (prev.has(itemId) ? prev : new Set(prev).add(itemId)))
  }

  const refCallbacks = useRef(new Map())
  function getMeasureRef(itemId) {
    if (!refCallbacks.current.has(itemId)) {
      refCallbacks.current.set(itemId, (el) => {
        const prevEl = elementsRef.current.get(itemId)
        if (prevEl) {
          if (roRef.current) roRef.current.unobserve(prevEl)
          prevEl.removeEventListener('load', prevEl._feedGridLoadHandler, true)
          prevEl.removeEventListener('error', prevEl._feedGridLoadHandler, true)
        }
        if (el) {
          el.dataset.itemId = itemId
          elementsRef.current.set(itemId, el)
          roRef.current?.observe(el)

          const img = el.querySelector('.feed-card-image')
          if (img) {
            if (img.complete) {
              markLoaded(itemId)
            } else {
              // Capture-phase load/error listeners on the wrapper, since <img> load
              // events don't bubble — this still catches them on the way down.
              const handler = (e) => {
                if (e.target === img) markLoaded(itemId)
              }
              el._feedGridLoadHandler = handler
              el.addEventListener('load', handler, true)
              el.addEventListener('error', handler, true)
            }
          } else {
            // No image on this card for some reason — don't block the whole grid on it.
            markLoaded(itemId)
          }
        } else {
          elementsRef.current.delete(itemId)
        }
      })
    }
    return refCallbacks.current.get(itemId)
  }

  const allLoaded = items.length > 0 && items.every((item) => loadedIds.has(item.id))

  const columns = useMemo(() => {
    const cols = Array.from({ length: columnCount }, () => ({ items: [], height: 0 }))

    if (!allLoaded) {
      // Stable placeholder layout while images are still loading — every card
      // keeps this position, so nothing remounts mid-load.
      items.forEach((item, i) => cols[i % columnCount].items.push(item))
      return cols.map((c) => c.items)
    }

    // Every card's image has loaded: do the actual shortest-column placement
    // once, using real measured heights, for the final settled layout.
    items.forEach((item) => {
      const shortest = cols.reduce((a, b) => (b.height < a.height ? b : a))
      shortest.items.push(item)
      shortest.height += heights[item.id] ?? 320
    })
    return cols.map((c) => c.items)
  }, [items, columnCount, allLoaded, heights])

  return (
    <div className="feed-grid">
      {columns.map((col, ci) => (
        <div className="feed-grid-column" key={ci}>
          {col.map((item, i) => (
            <div key={item.id} ref={getMeasureRef(item.id)}>
              <Reveal delay={(i % 5) * 70} className="feed-card-wrap">
                <FeedCard item={item} />
              </Reveal>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
