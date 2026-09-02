import { Link } from 'react-router-dom'
import { getStaticPage } from '../data/staticPages'

export default function StaticPage({ slug }) {
  const page = getStaticPage(slug)

  if (!page) {
    return (
      <div className="static-page">
        <h1>Page not found</h1>
        <Link to="/" className="btn-hero-primary">Back to Routicle</Link>
      </div>
    )
  }

  return (
    <div className="static-page">
      <h1>{page.title}</h1>
      {page.paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {page.faq && (
        <div className="static-faq">
          {page.faq.map((item) => (
            <div key={item.q} className="static-faq-item">
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
