import { SOFTWARE } from '../data/software'

export default function BrowseBySoftware() {
  return (
    <section className="software-browse">
      <h2 className="software-browse-title">Browse by Software</h2>

      <div className="software-grid">
        {SOFTWARE.map((s) => (
          <a href="#" key={s.name} className="software-item">
            <span className="software-icon" style={{ background: s.bg, color: s.color }}>
              {s.mono}
            </span>
            <span className="software-name">{s.name}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
