import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Dumbbell, Flame, Globe, Heart, Leaf, Music, Pause, Play, RefreshCw, Send, SkipForward, Smartphone, Watch, Zap } from 'lucide-react'
import { getMusicRecommendation } from '../services/api'
import { Badge, Button, Card, CardHeader, PageHeader } from '../ui/components'

const MOODS = [
  { key: 'cardio', label: 'Cardio', hint: 'High-tempo endurance', icon: Flame, tone: 'orange' },
  { key: 'strength', label: 'Strength', hint: 'Heavy lift focus', icon: Dumbbell, tone: 'gold' },
  { key: 'hiit', label: 'HIIT', hint: 'Explosive intervals', icon: Zap, tone: 'violet' },
  { key: 'relax', label: 'Relax', hint: 'Cooldown & recovery', icon: Heart, tone: 'red' },
  { key: 'yoga', label: 'Yoga', hint: 'Breath and flow', icon: Leaf, tone: 'green' },
]

const FALLBACK_PLAYLIST = (mood) => ({
  playlist_name: `${mood.toUpperCase()} Energy Mix`,
  provider: 'youtube',
  embed_url: 'https://www.youtube.com/embed/videoseries?list=PLu0ocO48LFms5WsI1ipaeanxqRjn2fC_5',
})

const CONNECTIONS = [
  { name: 'Google Fit', hint: 'Steps and heart rate', icon: Globe },
  { name: 'Apple Health', hint: 'iPhone & Apple Watch', icon: Smartphone },
]

export default function Integrations() {
  const [selectedMood, setSelectedMood] = useState('')
  const [isPlaying, setIsPlaying] = useState(true)

  const playlist = useMutation({
    mutationFn: (mood) => getMusicRecommendation(mood).catch(() => FALLBACK_PLAYLIST(mood)),
    onSuccess: () => setIsPlaying(true),
  })
  const musicData = playlist.data

  useEffect(() => {
    document.body.classList.toggle('music-playing-active', Boolean(musicData && isPlaying))
    return () => document.body.classList.remove('music-playing-active')
  }, [musicData, isPlaying])

  const pickMood = (mood) => {
    setSelectedMood(mood)
    playlist.mutate(mood)
  }

  const changeMood = () => {
    setSelectedMood('')
    playlist.reset()
  }

  const embedSrc = musicData?.embed_url
    ? `${musicData.embed_url}${musicData.embed_url.includes('?') ? '&' : '?'}autoplay=1&mute=0`
    : ''

  return (
    <div className="page">
      <PageHeader eyebrow="Gear" title="Integrations" subtitle="Session music, wearables and reminders in one place." />

      <div className="split">
        <Card>
          <CardHeader
            icon={Music}
            tone="violet"
            title="Session audio"
            subtitle="Mood-matched playlists that play right here"
            action={musicData && <Button variant="ghost" size="sm" icon={RefreshCw} onClick={changeMood}>Change mood</Button>}
          />

          {!musicData ? (
            <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(140px, 100%), 1fr))', gap: 12 }}>
              {MOODS.map((mood) => {
                const Icon = mood.icon
                const loading = playlist.isPending && selectedMood === mood.key
                return (
                  <button
                    key={mood.key}
                    type="button"
                    className="card card--interactive stack-sm"
                    style={{ alignItems: 'center', textAlign: 'center', padding: '20px 12px' }}
                    disabled={playlist.isPending}
                    onClick={() => pickMood(mood.key)}
                  >
                    <span className={`icon-tile icon-tile--${mood.tone} icon-tile--lg`}>{loading ? <span className="spinner" /> : <Icon size={24} />}</span>
                    <strong>{mood.label}</strong>
                    <span className="tiny muted">{mood.hint}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="stack">
              <div className="list-row" style={{ padding: 16 }}>
                <span className="icon-tile icon-tile--violet icon-tile--lg"><Music size={26} /></span>
                <div className="grow">
                  <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }} className="truncate">{musicData.playlist_name}</strong>
                  <div className="tiny muted">Tuned for {selectedMood}</div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <Button variant="primary" size="sm" icon={isPlaying ? Pause : Play} onClick={() => setIsPlaying((v) => !v)} aria-label={isPlaying ? 'Pause' : 'Play'} />
                  <Button variant="ghost" size="sm" icon={SkipForward} loading={playlist.isPending} onClick={() => playlist.mutate(selectedMood)} aria-label="Next playlist" />
                </div>
              </div>
              <div style={{ aspectRatio: '16 / 9', borderRadius: 16, overflow: 'hidden', background: '#000', border: '1px solid var(--border)' }}>
                {isPlaying ? (
                  <iframe
                    key={embedSrc}
                    src={embedSrc}
                    title="Music player"
                    style={{ width: '100%', height: '100%', border: 0 }}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  />
                ) : (
                  <div className="empty" style={{ height: '100%' }}>
                    <Pause size={40} />
                    <p>Audio paused</p>
                    <Button variant="primary" icon={Play} onClick={() => setIsPlaying(true)}>Resume</Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        <div className="stack">
          <Card>
            <CardHeader icon={Watch} tone="blue" title="Wearables" />
            <ul className="list">
              {CONNECTIONS.map((connection) => {
                const Icon = connection.icon
                return (
                  <li key={connection.name} className="list-row">
                    <Icon size={22} className="muted" />
                    <div className="grow">
                      <strong>{connection.name}</strong>
                      <div className="tiny muted">{connection.hint}</div>
                    </div>
                    <Badge>Coming soon</Badge>
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader icon={Send} tone="blue" title="Telegram bot" action={<Badge>Coming soon</Badge>} />
            <p className="small muted">Daily streak reminders and form summaries straight to Telegram. Turn on reminder types in Settings so they’re ready when it launches.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
