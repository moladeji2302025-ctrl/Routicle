import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SearchIcon, SlidersIcon, HeartIcon, ChevronDownIcon, ChevronRightIcon, StarIcon, SparkleIcon, SortIcon } from './icons'
import { DEPARTMENTS } from '../data/departments'

const TABS = [
  { label: 'Projects', to: '/explore' },
  { label: 'People', to: '/explore' },
  { label: 'Assets', to: '/explore' },
  { label: 'Images', to: '/explore' },
]

// A representative image per department for the photo-backed category chips (matches
// Behance's "Graphic Design / Photography / Illustration / ..." pill row).
const DEPARTMENT_CHIP_IMAGE = {
  'graphic-design': '/images/t1.jpg',
  'motion-graphics': '/images/t5.jpg',
  illustration: '/images/t7.jpg',
  'ai-images': '/images/t3.jpg',
  'ai-video': '/images/t9.jpg',
}

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
          <Link to="/explore" className="chip chip-active">
            <StarIcon size={12} />
            For You
          </Link>
          <Link to="/explore?following=1" className="chip chip-dark">
            <HeartIcon size={12} color="currentColor" />
            Following
          </Link>
          <Link to="/explore" className="chip chip-maroon">
            <SparkleIcon size={12} />
            Best of Routicle
          </Link>
          {DEPARTMENTS.map((dept) => (
            <Link
              key={dept.id}
              to={`/explore?department=${dept.id}`}
              className="chip chip-photo"
              style={{
                backgroundImage: `linear-gradient(0deg, rgba(0,0,0,0.55), rgba(0,0,0,0.25)), url(${DEPARTMENT_CHIP_IMAGE[dept.id]})`,
              }}
            >
              {dept.label}
            </Link>
          ))}
        </div>
        <button type="button" className="chip-scroll-next" onClick={scrollChipsNext}>
          <ChevronRightIcon size={16} />
        </button>
      </div>
    </div>
  )
}
