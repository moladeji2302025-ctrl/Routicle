import { Link } from 'react-router-dom'
import { SOFTWARE, FILE_TYPE_BY_SOFTWARE } from '../data/software'

export default function BrowseBySoftware() {
  return (
    <section className="software-browse">
      <h2 className="software-browse-title">Browse by Software</h2>

      <div className="software-grid">
        {SOFTWARE.map((s) => {
          const fileType = FILE_TYPE_BY_SOFTWARE[s.name]
          const to = fileType ? `/explore?fileType=${encodeURIComponent(fileType)}` : '/explore'
          return (
            <Link to={to} key={s.name} className="software-item">
              <span className="software-icon">
                <img src={s.icon} alt={s.name} className="software-icon-img" />
              </span>
              <span className="software-name">{s.name}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
