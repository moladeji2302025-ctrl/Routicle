import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { DEPARTMENTS } from '../data/departments'
import FeedGrid from '../components/FeedGrid'
import { SearchIcon } from '../components/icons'

export default function ExplorePage() {
  const { contentItems } = useApp()
  const [searchParams] = useSearchParams()
  const [department, setDepartment] = useState(null)
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [peopleOnly, setPeopleOnly] = useState(false)
  const [fileType, setFileType] = useState(null)

  const fileTypes = useMemo(() => {
    const set = new Set()
    contentItems.forEach((item) => item.fileTypes.forEach((ft) => set.add(ft)))
    return Array.from(set)
  }, [contentItems])

  const results = useMemo(() => {
    return contentItems.filter((item) => {
      if (item.moderationStatus !== 'approved') return false
      if (department && item.department !== department) return false
      if (fileType && !item.fileTypes.includes(fileType)) return false
      if (peopleOnly && item.department !== 'ai-images') return false
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        if (!item.title.toLowerCase().includes(q) && !item.creator.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [contentItems, department, fileType, peopleOnly, query])

  return (
    <div className="explore-page">
      <div className="explore-header">
        <h1 className="explore-title">Department &amp; search</h1>
        <div className="explore-search">
          <SearchIcon size={14} color="currentColor" />
          <input
            type="text"
            placeholder="Search by title or creator…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="explore-body">
        <aside className="explore-sidebar">
          <div className="explore-facet">
            <h4>Department</h4>
            <button
              type="button"
              className={department === null ? 'explore-facet-item explore-facet-active' : 'explore-facet-item'}
              onClick={() => setDepartment(null)}
            >
              All departments
            </button>
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept.id}
                type="button"
                className={department === dept.id ? 'explore-facet-item explore-facet-active' : 'explore-facet-item'}
                onClick={() => setDepartment(dept.id)}
              >
                {dept.label}
              </button>
            ))}
          </div>

          <div className="explore-facet">
            <h4>File type</h4>
            <button
              type="button"
              className={fileType === null ? 'explore-facet-item explore-facet-active' : 'explore-facet-item'}
              onClick={() => setFileType(null)}
            >
              Any file type
            </button>
            {fileTypes.map((ft) => (
              <button
                key={ft}
                type="button"
                className={fileType === ft ? 'explore-facet-item explore-facet-active' : 'explore-facet-item'}
                onClick={() => setFileType(ft)}
              >
                {ft}
              </button>
            ))}
          </div>

          <div className="explore-facet">
            <h4>People</h4>
            <label className="explore-checkbox">
              <input type="checkbox" checked={peopleOnly} onChange={(e) => setPeopleOnly(e.target.checked)} />
              AI-generated only
            </label>
          </div>
        </aside>

        <div className="explore-results">
          <p className="explore-count">{results.length} result{results.length === 1 ? '' : 's'}</p>
          {results.length > 0 ? (
            <FeedGrid items={results} />
          ) : (
            <p className="explore-empty">Nothing matches those filters yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
