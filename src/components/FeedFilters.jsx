import { SearchIcon, SlidersIcon, HeartIcon, ChevronDownIcon, ChevronRightIcon, StarIcon, SparkleIcon, SortIcon } from './icons'
import { ART_STYLES, SOFTWARE } from '../data/software'

const TABS = ['Projects', 'Creators', 'Assets', 'Files']

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
            <SortIcon size={13} />
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
          {ART_STYLES.map((style) => (
            <span
              key={style.name}
              className="chip chip-photo"
              style={{
                backgroundImage: `linear-gradient(0deg, rgba(0,0,0,0.55), rgba(0,0,0,0.25)), url(${style.image})`,
              }}
            >
              {style.name}
            </span>
          ))}
          {SOFTWARE.map((s) => (
            <span key={s.name} className="chip chip-software" style={{ background: s.bg, color: s.color }}>
              {s.name}
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
