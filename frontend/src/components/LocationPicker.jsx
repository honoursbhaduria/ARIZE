import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Globe, MapPin, Search } from 'lucide-react'
import { locationSearchQuery } from '../lib/queries'
import { Input } from '../ui/components'

export const GLOBAL_LOCATION = 'Global (International)'

// Debounce typing so we search once the user pauses.
function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

export default function LocationPicker({ value, onChange, id = 'location-search' }) {
  const [search, setSearch] = useState('')
  const term = useDebounced(search)
  const places = useQuery(locationSearchQuery(term))
  const typing = search.trim().length >= 2

  const choose = (label) => {
    onChange(label)
    setSearch('')
  }

  return (
    <div className="stack-sm">
      <div className="list-row" style={{ borderColor: 'var(--gold-deep)' }}>
        <MapPin size={18} color="var(--gold)" />
        <span className="grow truncate" style={{ fontWeight: 700 }}>{value || GLOBAL_LOCATION}</span>
      </div>
      <div className="input-icon">
        <Search size={18} />
        <Input
          id={id}
          placeholder="Search any city or town…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search for your city"
          autoComplete="off"
        />
      </div>
      <div className="stack-sm" style={{ maxHeight: 240, overflowY: 'auto' }} role="listbox" aria-label="Locations">
        {!typing && (
          <button type="button" role="option" aria-selected={value === GLOBAL_LOCATION} className="nav-link" style={{ justifyContent: 'space-between' }} onClick={() => choose(GLOBAL_LOCATION)}>
            <span className="row" style={{ gap: 8 }}><Globe size={16} /> {GLOBAL_LOCATION}</span>
            {value === GLOBAL_LOCATION && <Check size={16} />}
          </button>
        )}
        {typing && (places.isFetching || term !== search) && <p className="small muted center" style={{ padding: 12 }}>Searching…</p>}
        {typing && places.isError && <p className="small red center" style={{ padding: 12 }}>Location search is unavailable. Try again shortly.</p>}
        {typing && places.isSuccess && term === search && places.data.length === 0 && (
          <p className="small muted center" style={{ padding: 12 }}>No places found for “{search}”.</p>
        )}
        {typing && term === search && (places.data || []).map((place) => (
          <button
            key={place.id ?? place.label}
            type="button"
            role="option"
            aria-selected={value === place.label}
            className="nav-link"
            style={{ justifyContent: 'space-between' }}
            onClick={() => choose(place.label)}
          >
            <span className="truncate">{place.label}</span>
            {value === place.label && <Check size={16} />}
          </button>
        ))}
      </div>
    </div>
  )
}
