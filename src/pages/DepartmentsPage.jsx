import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { DEPARTMENTS } from '../data/departments'

const BLURBS = {
  'graphic-design': 'Posters, covers, social templates, and other finished graphic work.',
  'motion-graphics': 'Openers, lower thirds, kinetic type, and edited video pieces.',
  illustration: 'Original illustration and character/concept art.',
  'ai-images': 'AI-generated stills, ready to use or extend.',
  'ai-video': 'AI-generated video clips and motion pieces.',
}

export default function DepartmentsPage() {
  const { contentItems } = useApp()
  const approved = contentItems.filter((item) => item.moderationStatus === 'approved')

  const cards = DEPARTMENTS.map((dept) => {
    const items = approved.filter((item) => item.department === dept.id)
    return { ...dept, count: items.length, image: items[0]?.image }
  })

  return (
    <div className="departments-page">
      <div className="departments-head">
        <h1 className="deck-heading">Departments</h1>
        <div className="deck-accent" aria-hidden="true" />
        <p className="departments-intro">
          The library organized by kind of work. Pick one to browse, or search across all of them
          from Explore.
        </p>
      </div>

      <div className="departments-grid">
        {cards.map((dept) => (
          <Link key={dept.id} to={`/explore?department=${dept.id}`} className="department-card">
            <div className="department-card-media">
              {dept.image && <img src={dept.image} alt="" />}
            </div>
            <div className="department-card-body">
              <h3 className="department-card-label">{dept.label}</h3>
              <p className="department-card-desc">{BLURBS[dept.id]}</p>
              <span className="department-card-count">{dept.count} item{dept.count === 1 ? '' : 's'}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
