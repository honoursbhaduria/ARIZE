import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dumbbell, Flame, Heart, Leaf, Music as MusicIcon, Pause, Play, Search, SkipBack, SkipForward, Square, Volume2, VolumeX, X, Zap } from 'lucide-react'
import { musicSearchQuery } from '../lib/queries'
import { useMusic } from '../lib/music-context'
import { Alert, Card, CardHeader, EmptyState, PageHeader, Skeleton } from '../ui/components'
import TrackArt from '../components/TrackArt'
import './Music.css'

const MOODS = [
  { key: 'cardio', label: 'Cardio', hint: 'High-tempo endurance', icon: Flame, tone: 'orange' },
  { key: 'strength', label: 'Strength', hint: 'Heavy lift focus', icon: Dumbbell, tone: 'gold' },
  { key: 'hiit', label: 'HIIT', hint: 'Explosive intervals', icon: Zap, tone: 'violet' },
  { key: 'relax', label: 'Relax', hint: 'Cooldown & recovery', icon: Heart, tone: 'red' },
  { key: 'yoga', label: 'Yoga', hint: 'Breath and flow', icon: Leaf, tone: 'green' },
]

const SUGGESTIONS = ['Workout hip hop', 'Gym motivation', 'EDM', 'Rock', 'Lo-fi']

const clock = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

export default function Music() {
  const music = useMusic()
  const { track, playing, buffering, loading, error, time, queue, index } = music
  const upNext = queue.slice(index + 1, index + 6)
  const [term, setTerm] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [lastVolume, setLastVolume] = useState(0.8)
  const results = useQuery(musicSearchQuery(submitted))

  // Search as you type, after a short pause.
  useEffect(() => {
    const id = setTimeout(() => setSubmitted(term), 450)
    return () => clearTimeout(id)
  }, [term])

  const searchFor = (value) => {
    setTerm(value)
    setSubmitted(value)
  }
  const muted = music.volume === 0

  const toggleMute = () => {
    if (muted) {
      music.setVolume(lastVolume || 0.8)
    } else {
      setLastVolume(music.volume)
      music.setVolume(0)
    }
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Session audio" title="Music" subtitle="Pick a mood and keep training. Music plays in the background on every page." />

      {error && <Alert tone="error">{error}</Alert>}

      {track && (
        <Card tone="gold" className="player">
          <div className="player__top">
            <TrackArt key={track.id} src={track.artwork} className="player__art" iconSize={30} />
            <div className="player__meta">
              <span className="eyebrow">{buffering ? 'Loading track…' : playing ? 'Now playing' : 'Paused'} · {music.playlistName}</span>
              <strong className="player__title">{track.title}</strong>
              <span className="small muted truncate">by {track.artist}</span>
            </div>
          </div>

          <div className="player__progress">
            <input
              type="range"
              min={0}
              max={Math.max(1, Math.floor(time.duration || track.duration || 0))}
              value={Math.floor(time.current)}
              onChange={(e) => music.seek(Number(e.target.value))}
              aria-label="Seek"
              style={{ '--pct': `${time.duration ? (time.current / time.duration) * 100 : 0}%` }}
            />
            <div className="spread tiny mono muted">
              <span>{clock(time.current)}</span>
              <span>{clock(time.duration || track.duration)}</span>
            </div>
          </div>

          <div className="player__controls">
            <button type="button" className="icon-btn player__btn" onClick={music.stop} aria-label="Stop"><Square size={18} /></button>
            <button type="button" className="icon-btn player__btn" onClick={music.previous} aria-label="Previous track"><SkipBack size={20} /></button>
            <button type="button" className="player__play" onClick={music.toggle} aria-label={playing ? 'Pause' : 'Play'}>
              {buffering ? <span className="spinner" /> : playing ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button type="button" className="icon-btn player__btn" onClick={music.next} aria-label="Next track"><SkipForward size={20} /></button>
            <button type="button" className="icon-btn player__btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </button>
          </div>
          <input
            type="range"
            className="player__volume"
            min={0}
            max={1}
            step={0.05}
            value={music.volume}
            onChange={(e) => music.setVolume(Number(e.target.value))}
            aria-label="Volume"
            style={{ '--pct': `${music.volume * 100}%` }}
          />
        </Card>
      )}

      <Card className="stack">
        <CardHeader icon={Search} tone="gold" title="Search music" subtitle="Any song, artist or genre" />
        <form className="music-search" role="search" onSubmit={(e) => { e.preventDefault(); setSubmitted(term) }}>
          <Search size={18} className="music-search__icon" aria-hidden="true" />
          <input
            className="input"
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Song, artist or genre"
            aria-label="Search songs"
            enterKeyHint="search"
            autoComplete="off"
          />
          {results.isFetching ? (
            <span className="spinner music-search__end" aria-label="Searching" />
          ) : term && (
            <button type="button" className="icon-btn music-search__end" onClick={() => searchFor('')} aria-label="Clear search"><X size={16} /></button>
          )}
        </form>

        {!submitted.trim() && (
          <div className="music-suggest">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => searchFor(s)}>{s}</button>
            ))}
          </div>
        )}
        {submitted.trim().length === 1 && <p className="tiny dim">Type at least 2 letters.</p>}
        {results.isLoading && (
          <div className="stack-sm">{[0, 1, 2].map((i) => <Skeleton key={i} height={56} />)}</div>
        )}
        {results.isError && <Alert tone="error">{results.error?.message || 'Search is unavailable right now.'}</Alert>}
        {results.isSuccess && results.data.length === 0 && (
          <EmptyState icon={MusicIcon} title="No songs found">Try another song, artist or genre.</EmptyState>
        )}
        {results.data?.length > 0 && (
          <p className="tiny muted">{results.data.length} songs · tap one to play, the rest queue up after it</p>
        )}
        {results.data?.length > 0 && (
          <ol className="list music-results">
            {results.data.map((item, i) => {
              const current = track?.id === item.id
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`list-row up-next ${current ? 'is-current' : ''}`}
                    onClick={() => music.playTracks(results.data, `“${submitted.trim()}”`, i)}
                    aria-label={`Play ${item.title} by ${item.artist}`}
                  >
                    <TrackArt src={item.artwork} className="up-next__art" iconSize={14} />
                    <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
                      <span className="truncate" style={{ display: 'block', fontWeight: 600 }}>{item.title}</span>
                      <span className="truncate tiny muted" style={{ display: 'block' }}>{item.artist}</span>
                    </span>
                    {current && playing ? <Volume2 size={16} className="gold" /> : <span className="tiny mono dim">{clock(item.duration)}</span>}
                    <span className="up-next__play" aria-hidden="true">{current && playing ? <Pause size={14} /> : <Play size={14} />}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </Card>

      <div className={track ? 'split' : ''}>
        <Card>
          <CardHeader icon={MusicIcon} tone="violet" title="Choose your mood" subtitle="Full tracks from Audius, shuffled for each session" />
          <div className="music-moods">
            {MOODS.map((mood) => {
              const Icon = mood.icon
              const active = music.mood === mood.key
              return (
                <button
                  key={mood.key}
                  type="button"
                  className={`music-mood ${active ? 'is-active' : ''} ${loading && active ? 'is-loading' : ''}`}
                  onClick={() => music.playMood(mood.key)}
                  disabled={loading}
                  aria-pressed={active}
                >
                  <span className={`icon-tile icon-tile--${mood.tone}`}>{loading && active ? <span className="spinner" /> : <Icon size={20} />}</span>
                  <span className="music-mood__text">
                    <strong>{mood.label}</strong>
                    <span className="tiny muted">{mood.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
          {loading && !track && <p className="small muted" style={{ marginTop: 12 }}>Finding tracks…</p>}
        </Card>

        {track && upNext.length > 0 && (
          <Card>
            <CardHeader title="Up next" />
            <ol className="list">
              {upNext.map((item, offset) => (
                <li key={item.id}>
                  <button type="button" className="list-row up-next" onClick={() => music.playAt(index + 1 + offset)}>
                    <TrackArt src={item.artwork} className="up-next__art" iconSize={14} />
                    <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
                      <span className="truncate" style={{ display: 'block', fontWeight: 600 }}>{item.title}</span>
                      <span className="truncate tiny muted" style={{ display: 'block' }}>{item.artist}</span>
                    </span>
                    <span className="tiny mono dim">{clock(item.duration)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>
    </div>
  )
}
