import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SearchIcon, SlidersIcon, HeartIcon, ChevronDownIcon, ChevronRightIcon, StarIcon, SparkleIcon, SortIcon } from './icons'
import { ART_STYLES, SOFTWARE, FILE_TYPE_BY_SOFTWARE } from '../data/software'

const TABS = [
  { label: 'Projects', to: '/explore' },
  { label: 'Creators', to: '/explore' },
  { label: 'Assets', to: '/explore' },
  { label: 'Files', to: '/explore' },
]

export default function FeedFilters() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  function handleSearchSubmit(event) {
    event.preventDefault()
    navigate(query.trim() ? `/explore?q=${encodeURIComponent(query.trim())}` : '/explore')
  }

  function scrollChipsNext(event) {
    const row = event.currentTarget.previousElementSibling
    row?.scrollBy({ left: 240, behavior: 'smooth' })
  }

  return (
    <div className="feed-filters">
      <div className="feed-filters-row">
        <Link to="/explore" className="filter-btn">
          <SlidersIcon size={14} />
          Filter
        </Link>

        <form className="feed-search" onSubmit={handleSearchSubmit}>
          <SearchIcon size={14} color="currentColor" />
          <input
            type="text"
            placeholder="Search Routicle…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <div className="feed-filters-right">
          <div className="feed-tabs">
            {TABS.map((tab, i) => (
              <Link key={tab.label} to={tab.to} className={i === 0 ? 'feed-tab feed-tab-active' : 'feed-tab'}>
                {tab.label}
              </Link>
            ))}
          </div>

          <Link to="/collections" className="feed-icon-btn" title="Saved items">
            <HeartIcon size={15} color="currentColor" />
          </Link>

          <Link to="/explore" className="feed-sort-btn">
            <SortIcon size={13} />
            Recommended
            <ChevronDownIcon size={11} />
          </Link>
        </div>
      </div>

      <div className="chip-scroll">
        <div className="chip-row">
          <Link to="/explore" className="chip chip-dark">
            <StarIcon size={12} />
            For You
          </Link>
          <Link to="/explore?following=1" className="chip chip-dark">
            <HeartIcon size={12} color="currentColor" />
            Following
          </Link>
          <Link to="/explore" className="chip chip-dark">
            <SparkleIcon size={12} />
            Featured
          </Link>
          {ART_STYLES.map((style) => (
            <Link
              key={style.name}
              to="/explore"
              className="chip chip-photo"
              style={{
                backgroundImage: `linear-gradient(0deg, rgba(0,0,0,0.55), rgba(0,0,0,0.25)), url(${style.image})`,
              }}
            >
              {style.name}
            </Link>
          ))}
          {SOFTWARE.map((s) => {
            const fileType = FILE_TYPE_BY_SOFTWARE[s.name]
            const to = fileType ? `/explore?fileType=${encodeURIComponent(fileType)}` : '/explore'
            return (
              <Link key={s.name} to={to} className="chip chip-software">
                <img src={s.icon} alt="" className="chip-software-icon" />
                {s.name}
              </Link>
            )
          })}
        </div>
        <button type="button" className="chip-scroll-next" onClick={scrollChipsNext}>
          <ChevronRightIcon size={16} />
        </button>
      </div>
    </div>
  )
}
