import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { CATEGORIES } from '../data/categories'
import { applyBrowsingFilters } from '../data/settings'
import { getCreatorByName } from '../data/creators'
import FeedGrid from '../components/FeedGrid'
import NewsletterSignup from '../components/NewsletterSignup'
import { SearchIcon, SlidersIcon, ChevronDownIcon } from '../components/icons'

// How many results come before the email signup for logged-out visitors.
const NEWSLETTER_AFTER = 12

const SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'recent', label: 'Most Recent' },
  { id: 'appreciated', label: 'Most Appreciated' },
]

export default function ExplorePage() {
  const { contentItems, currentUser, settings } = useApp()
  const [searchParams] = useSearchParams()
  const [category, setCategory] = useState(searchParams.get('category') || null)
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [peopleOnly, setPeopleOnly] = useState(false)
  const [fileType, setFileType] = useState(searchParams.get('fileType') || null)
  const [followingOnly, setFollowingOnly] = useState(searchParams.get('following') === '1')
  const [sort, setSort] = useState(settings.browsing.defaultSort)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  // Muted categories / "hide AI work" are applied before anything on this page's
  // own toolbar, so the counts and facets below only ever describe visible work.
  const visibleItems = useMemo(
    () => applyBrowsingFilters(contentItems, settings.browsing),
    [contentItems, settings.browsing]
  )

  const fileTypes = useMemo(() => {
    const set = new Set()
    visibleItems.forEach((item) => item.fileTypes.forEach((ft) => set.add(ft)))
    return Array.from(set)
  }, [visibleItems])

  const results = useMemo(() => {
    let list = visibleItems.filter((item) => {
      if (item.moderationStatus !== 'approved') return false
      if (category && item.category !== category) return false
      if (fileType && !item.fileTypes.includes(fileType)) return false
      if (peopleOnly && item.category !== 'ai-images') return false
      if (followingOnly) {
        const creatorId = getCreatorByName(item.creator)?.id
        if (!creatorId || !currentUser?.followingCreatorIds?.includes(creatorId)) return false
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        if (!item.title.toLowerCase().includes(q) && !item.creator.toLowerCase().includes(q)) return false
      }
      return true
    })

    if (sort === 'appreciated') list = [...list].sort((a, b) => b.appreciations - a.appreciations)
    else if (sort === 'recent') list = [...list].sort((a, b) => b.id - a.id)

    return list
  }, [visibleItems, category, fileType, peopleOnly, followingOnly, currentUser, query, sort])

  // A muted category shouldn't offer a chip that filters down to nothing.
  const chips = [
    { id: null, label: 'All' },
    ...CATEGORIES.filter((d) => visibleItems.some((item) => item.category === d.id)),
  ]

  return (
    <div className="explore-page">
      <div className="explore-toolbar">
        <button
          type="button"
          className={filterOpen ? 'explore-filter-btn explore-filter-btn-active' : 'explore-filter-btn'}
          onClick={() => setFilterOpen((v) => !v)}
        >
          <SlidersIcon size={14} color="currentColor" />
          Filter
        </button>

        <div className="explore-search-bar">
          <SearchIcon size={14} color="currentColor" />
          <input
            type="text"
            placeholder="Search by title or creator…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="explore-sort">
          <button type="button" className="explore-sort-btn" onClick={() => setSortOpen((v) => !v)}>
            {SORTS.find((s) => s.id === sort).label}
            <ChevronDownIcon size={11} color="currentColor" />
          </button>
          {sortOpen && (
            <div className="explore-sort-menu">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={s.id === sort ? 'explore-sort-item explore-sort-item-active' : 'explore-sort-item'}
                  onClick={() => { setSort(s.id); setSortOpen(false) }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="explore-chip-row">
        {chips.map((chip) => (
          <button
            key={chip.id ?? 'all'}
            type="button"
            className={category === chip.id ? 'explore-chip explore-chip-active' : 'explore-chip'}
            onClick={() => setCategory(chip.id)}
          >
            {chip.label}
          </button>
        ))}
        {currentUser && (
          <button
            type="button"
            className={followingOnly ? 'explore-chip explore-chip-active' : 'explore-chip'}
            onClick={() => setFollowingOnly((v) => !v)}
          >
            Following
          </button>
        )}
      </div>

      {filterOpen && (
        <div className="explore-filter-panel">
          <div className="explore-filter-group">
            <h4>File type</h4>
            <div className="explore-filter-options">
              <button
                type="button"
                className={fileType === null ? 'explore-facet-item explore-facet-active' : 'explore-facet-item'}
                onClick={() => setFileType(null)}
              >
                Any file type
              </button>
              {fileTypes.map((ft) => (
                <button
                  key={ft}
                  type="button"
                  className={fileType === ft ? 'explore-facet-item explore-facet-active' : 'explore-facet-item'}
                  onClick={() => setFileType(ft)}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          <div className="explore-filter-group">
            <h4>People</h4>
            <label className="explore-checkbox">
              <input type="checkbox" checked={peopleOnly} onChange={(e) => setPeopleOnly(e.target.checked)} />
              AI-generated only
            </label>
          </div>
        </div>
      )}

      <p className="explore-count">{results.length} result{results.length === 1 ? '' : 's'}</p>

      {results.length > 0 && !currentUser && results.length > NEWSLETTER_AFTER ? (
        // Logged-out visitors get the email signup a couple of rows in, where
        // someone browsing will actually pass it, rather than under the footer.
        <>
          <FeedGrid items={results.slice(0, NEWSLETTER_AFTER)} className="feed-grid-split" />
          <NewsletterSignup variant="band" source="explore" />
          <FeedGrid items={results.slice(NEWSLETTER_AFTER)} />
        </>
      ) : results.length > 0 ? (
        <>
          <FeedGrid items={results} />
          {!currentUser && <NewsletterSignup variant="band" source="explore" />}
        </>
      ) : (
        <p className="explore-empty">Nothing matches those filters yet.</p>
      )}
    </div>
  )
}
