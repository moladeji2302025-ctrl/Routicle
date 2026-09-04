import { useEffect, useMemo, useRef, useState } from 'react'
import FeedCard from './FeedCard'
import Reveal from './Reveal'

function columnCountFor(width) {
  if (width <= 520) return 1
  if (width <= 780) return 2
  if (width <= 1100) return 3
  return 5
}

/**
 * A real (shortest-column-first) masonry, not CSS `column-count`. CSS columns
 * fill straight down column 1, then column 2, etc, with no awareness of how
 * tall any other column ended up — so the last row is always ragged, some
 * columns ending far short of others. This measures each card's actual
 * rendered height (via ResizeObserver, since images load asynchronously and
 * change height) and always places the next item into whichever column is
 * currently shortest, so every column's bottom edge ends up close to level.
 */
export default function FeedGrid({ items }) {
  const [columnCount, setColumnCount] = useState(() => columnCountFor(window.innerWidth))
  const [heights, setHeights] = useState({})
  const observers = useRef(new Map())

  useEffect(() => {
    function onResize() {
      setColumnCount(columnCountFor(window.innerWidth))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(
    () => () => {
      observers.current.forEach((obs) => obs.disconnect())
      observers.current.clear()
    },
    []
  )

  function measureRef(itemId) {
    return (el) => {
      const existing = observers.current.get(itemId)
      if (existing) {
        existing.disconnect()
        observers.current.delete(itemId)
      }
      if (!el) return
      const obs = new ResizeObserver((entries) => {
        const h = entries[0]?.contentRect?.height
        if (!h) return
        setHeights((prev) => (prev[itemId] === h ? prev : { ...prev, [itemId]: h }))
      })
      obs.observe(el)
      observers.current.set(itemId, obs)
    }
  }

  const columns = useMemo(() => {
    const cols = Array.from({ length: columnCount }, () => ({ items: [], height: 0 }))
    items.forEach((item, i) => {
      const measured = heights[item.id]
      // Not measured yet (first paint): round-robin so initial placement is stable
      // and doesn't jump every item to column 0 before any heights are known.
      const target = measured == null ? cols[i % columnCount] : cols.reduce((a, b) => (b.height < a.height ? b : a))
      target.items.push(item)
      target.height += measured ?? 320
    })
    return cols.map((c) => c.items)
  }, [items, columnCount, heights])

  return (
    <div className="feed-grid">
      {columns.map((col, ci) => (
        <div className="feed-grid-column" key={ci}>
          {col.map((item, i) => (
            <div key={item.id} ref={measureRef(item.id)}>
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
