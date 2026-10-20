import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Pause, Play, SkipForward, X } from 'lucide-react'
import { getMusicRecommendation } from '../services/api'
import { MusicContext } from '../lib/music-context'
import TrackArt from './TrackArt'
import './MusicDock.css'

// Background music: one <audio> element in the app shell plays an Audius
// queue, so music keeps going on every page with no video on screen.
export default function MusicProvider({ children }) {
  const audioRef = useRef(null)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [mood, setMood] = useState(null)
  const [playlistName, setPlaylistName] = useState('')
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [time, setTime] = useState({ current: 0, duration: 0 })
  const [volume, setVolumeState] = useState(0.8)

  const track = queue[index] || null
  const failuresRef = useRef(0) // consecutive tracks that failed to stream

  const playMood = useCallback(async (nextMood) => {
    setLoading(true)
    setError('')
    try {
      const data = await getMusicRecommendation(nextMood)
      if (!data?.tracks?.length) throw new Error('No tracks found for this mood.')
      setMood(nextMood)
      setPlaylistName(data.playlist_name)
      setQueue(data.tracks)
      setIndex(0)
      setPlaying(true)
    } catch (err) {
      setError(err.message || 'Music is unavailable right now.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Play a list the user picked (e.g. search results), starting at `start`.
  const playTracks = useCallback((tracks, name, start = 0) => {
    if (!tracks?.length) return
    setError('')
    setMood(null)
    setPlaylistName(name)
    setQueue(tracks)
    setIndex(start)
    setPlaying(true)
  }, [])

  // Load the current track and keep the element in sync with `playing`.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !track) return
    if (audio.dataset.trackId !== track.id) {
      audio.dataset.trackId = track.id
      audio.src = track.stream_url
      setTime({ current: 0, duration: track.duration || 0 })
    }
    if (playing) {
      audio.play().catch(() => setPlaying(false)) // autoplay blocked until the user taps play
    } else {
      audio.pause()
    }
  }, [track, playing])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const next = useCallback(() => setIndex((i) => (queue.length ? (i + 1) % queue.length : 0)), [queue.length])
  const previous = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.currentTime > 5) {
      audio.currentTime = 0 // first press restarts the track, like most players
      return
    }
    setIndex((i) => (queue.length ? (i - 1 + queue.length) % queue.length : 0))
  }, [queue.length])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      delete audio.dataset.trackId
      audio.load()
    }
    setQueue([])
    setIndex(0)
    setPlaying(false)
    setMood(null)
  }, [])

  const value = useMemo(() => ({
    mood,
    playlistName,
    queue,
    index,
    track,
    playing,
    loading,
    error,
    time,
    volume,
    playMood,
    playTracks,
    toggle: () => setPlaying((p) => !p),
    next,
    previous,
    stop,
    playAt: (i) => {
      setIndex(i)
      setPlaying(true)
    },
    seek: (seconds) => {
      if (audioRef.current) audioRef.current.currentTime = seconds
    },
    setVolume: setVolumeState,
  }), [mood, playlistName, queue, index, track, playing, loading, error, time, volume, playMood, playTracks, next, previous, stop])

  const onMusicPage = pathname.startsWith('/music')

  useEffect(() => {
    document.body.classList.toggle('has-music-bar', Boolean(track) && !onMusicPage)
    return () => document.body.classList.remove('has-music-bar')
  }, [track, onMusicPage])

  return (
    <MusicContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="none"
        onTimeUpdate={(e) => setTime({ current: e.currentTarget.currentTime, duration: e.currentTarget.duration || track?.duration || 0 })}
        onEnded={next}
        onPlaying={() => { failuresRef.current = 0 }}
        onError={() => {
          if (!track) return
          failuresRef.current += 1
          if (failuresRef.current >= queue.length) {
            // Every track in the queue failed; stop instead of skipping forever.
            failuresRef.current = 0
            setPlaying(false)
            setError('These tracks could not be streamed right now. Try another search or mood.')
            return
          }
          next()
        }}
      />
      {track && !onMusicPage && (
        <aside className="music-bar" aria-label="Music player">
          <TrackArt key={track.id} src={track.artwork} className="music-bar__art" />
          <Link to="/music" className="music-bar__text">
            <span className="truncate music-bar__title">{track.title}</span>
            <span className="truncate tiny muted">{track.artist}</span>
          </Link>
          <button type="button" className="icon-btn" onClick={value.toggle} aria-label={playing ? 'Pause music' : 'Play music'}>
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button type="button" className="icon-btn" onClick={next} aria-label="Next track"><SkipForward size={18} /></button>
          <button type="button" className="icon-btn" onClick={stop} aria-label="Stop music"><X size={18} /></button>
          <span className="music-bar__progress" style={{ width: `${time.duration ? (time.current / time.duration) * 100 : 0}%` }} />
        </aside>
      )}
    </MusicContext.Provider>
  )
}
