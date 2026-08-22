import { SearchIcon, SlidersIcon, HeartIcon, ChevronDownIcon, ChevronRightIcon, StarIcon, SparkleIcon } from './icons'

const TABS = ['Projects', 'Creators', 'Files']

const DEPARTMENT_CHIPS = [
  { label: 'Graphic Design', image: '/images/t1.jpg' },
  { label: 'Motion Graphics', image: '/images/t2.jpg' },
  { label: 'Illustration', image: '/images/t4.jpg' },
  { label: 'AI Images', image: '/images/t3.jpg' },
  { label: 'AI Video', image: '/images/t7.jpg' },
  { label: 'Templates', image: '/images/t6.jpg' },
]

export default function FeedFilters() {
  return (
    <div className="feed-filters">
      <div className="feed-filters-row">
        <button type="button" className="filter-btn">
          <SlidersIcon size={14} />
          Filter
        </button>

        <div className="feed-search">
          <SearchIcon size={14} color="currentColor" />
          <input type="text" placeholder="Search Routicle…" />
        </div>

        <div className="feed-filters-right">
          <div className="feed-tabs">
            {TABS.map((tab, i) => (
              <span key={tab} className={i === 0 ? 'feed-tab feed-tab-active' : 'feed-tab'}>{tab}</span>
            ))}
          </div>

          <button type="button" className="feed-icon-btn">
            <HeartIcon size={15} color="currentColor" />
          </button>

          <button type="button" className="feed-sort-btn">
            Recommended
            <ChevronDownIcon size={11} />
          </button>
        </div>
      </div>

      <div className="chip-scroll">
        <div className="chip-row">
          <span className="chip chip-dark">
            <StarIcon size={12} />
            For You
          </span>
          <span className="chip chip-dark">
            <HeartIcon size={12} color="currentColor" />
            Following
          </span>
          <span className="chip chip-dark">
            <SparkleIcon size={12} />
            Featured
          </span>
          {DEPARTMENT_CHIPS.map((chip) => (
            <span
              key={chip.label}
              className="chip chip-photo"
              style={{
                backgroundImage: `linear-gradient(0deg, rgba(0,0,0,0.55), rgba(0,0,0,0.25)), url(${chip.image})`,
              }}
            >
              {chip.label}
            </span>
          ))}
        </div>
        <button type="button" className="chip-scroll-next">
          <ChevronRightIcon size={16} />
        </button>
      </div>
    </div>
  )
}
