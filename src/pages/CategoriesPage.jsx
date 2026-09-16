import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { CATEGORIES } from '../data/categories'

const BLURBS = {
  'graphic-design': 'Posters, covers, social templates, and other finished graphic work.',
  'motion-graphics': 'Openers, lower thirds, kinetic type, and edited video pieces.',
  illustration: 'Original illustration and character/concept art.',
  'ai-images': 'AI-generated stills, ready to use or extend.',
  'ai-video': 'AI-generated video clips and motion pieces.',
}

export default function CategoriesPage() {
  const { contentItems } = useApp()
  const approved = contentItems.filter((item) => item.moderationStatus === 'approved')

  const cards = CATEGORIES.map((dept) => {
    const items = approved.filter((item) => item.category === dept.id)
    return { ...dept, count: items.length, image: items[0]?.image }
  })

  return (
    <div className="categories-page">
      <div className="categories-head">
        <h1 className="deck-heading">Categories</h1>
        <div className="deck-accent" aria-hidden="true" />
        <p className="categories-intro">
          The library organized by kind of work. Pick one to browse, or search across all of them
          from Explore.
        </p>
      </div>

      <div className="categories-grid">
        {cards.map((dept) => (
          <Link key={dept.id} to={`/explore?category=${dept.id}`} className="category-card">
            <div className="category-card-media">
              {dept.image && <img src={dept.image} alt="" />}
            </div>
            <div className="category-card-body">
              <h3 className="category-card-label">{dept.label}</h3>
              <p className="category-card-desc">{BLURBS[dept.id]}</p>
              <span className="category-card-count">{dept.count} item{dept.count === 1 ? '' : 's'}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
