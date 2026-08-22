import { PlusIcon } from './icons'

const SORTS = ['Recommended', 'Curated', 'Most appreciated', 'Most recent']

export default function Navbar({ activeSort = 'Recommended' }) {
  return (
    <div className="navbar">
      <div className="navbar-row">
        <a href="#" className="logo">
          <img src="/brand/routicle-wordmark-black.svg" alt="Routicle" />
        </a>

        <nav className="navbar-links">
          <a href="#" className="link-strong">Explore</a>
          <a href="#" className="link-muted">For You</a>
          <a href="#" className="link-muted">Following</a>
        </nav>

        <div className="navbar-spacer" />

        <a href="#" className="btn-outline">
          <PlusIcon size={14} />
          Create
        </a>
        <a href="#" className="link-muted">Sign in</a>
        <a href="#" className="btn-solid">Sign up</a>
      </div>

      <div className="subnav-row">
        <div className="sort-row">
          {SORTS.map((sort) => (
            <span key={sort} className={sort === activeSort ? 'sort-active' : 'sort-inactive'}>
              {sort}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
