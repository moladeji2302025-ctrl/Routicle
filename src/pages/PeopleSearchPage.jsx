import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../lib/api'
import { SearchIcon, UserIcon } from '../components/icons'

export default function PeopleSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [people, setPeople] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const q = query.trim()
    setSearchParams(q ? { q } : {}, { replace: true })

    if (!q) {
      setPeople(null)
      return undefined
    }
    let cancelled = false
    const t = setTimeout(() => {
      api
        .searchPeople(q)
        .then(({ people: rows }) => { if (!cancelled) { setPeople(rows); setError('') } })
        .catch((err) => { if (!cancelled) setError(err.message) })
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return (
    <div className="explore-page">
      <h1 className="deck-heading">People</h1>
      <div className="deck-accent" aria-hidden="true" />
      <p className="explore-count" style={{ marginTop: 18 }}>Find a creator or any Routicle member by name.</p>

      <div className="explore-search-bar" style={{ marginTop: 18 }}>
        <SearchIcon size={14} color="currentColor" />
        <input
          type="text"
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {error && <p className="settings-error">{error}</p>}

      {!query.trim() ? (
        <p className="explore-empty">Start typing a name to search.</p>
      ) : people === null ? (
        <p className="explore-empty">Searching…</p>
      ) : people.length === 0 ? (
        <p className="explore-empty">No one matches “{query.trim()}”.</p>
      ) : (
        <div className="people-grid">
          {people.map((p) => (
            <Link key={p.id} to={`/people/${p.id}`} className="people-card">
              {p.image ? (
                <img src={p.image} alt="" className="people-card-avatar" />
              ) : (
                <span className="people-card-avatar people-card-avatar-fallback">
                  <UserIcon size={18} color="currentColor" />
                </span>
              )}
              <span className="people-card-name">{p.name || 'Routicle member'}</span>
              {p.isCreator && <span className="tag tag-category">Creator</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
