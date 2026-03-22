import { useMemo, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Watch, 
  Send, 
  Music, 
  Link2, 
  Flame, 
  Dumbbell, 
  Zap, 
  Heart, 
  Leaf, 
  Loader2, 
  Play, 
  Pause, 
  SkipForward,
  Square,
  Globe,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  MessageSquare,
  Activity
} from 'lucide-react'
import { getMusicRecommendation } from '../services/api'

const moods = [
  { key: 'cardio', label: 'Cardio', hint: 'High-tempo endurance', icon: Flame },
  { key: 'strength', label: 'Strength', hint: 'Heavy lift focus', icon: Dumbbell },
  { key: 'hiit', label: 'HIIT', hint: 'Explosive intervals', icon: Zap },
  { key: 'relax', label: 'Relax', hint: 'Cooldown and recovery', icon: Heart },
  { key: 'yoga', label: 'Yoga', hint: 'Breath and flow', icon: Leaf },
]

export default function Integrations() {
  const [selectedMood, setSelectedMood] = useState('')
  const [musicData, setMusicData] = useState(null)
  const [isLoadingMusic, setIsLoadingMusic] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)

  // Manage global music playing class
  useEffect(() => {
    if (musicData && isPlaying) {
      document.body.classList.add('music-playing-active')
    } else {
      document.body.classList.remove('music-playing-active')
    }
    return () => document.body.classList.remove('music-playing-active')
  }, [musicData, isPlaying])
  
  const handleGetPlaylist = async (mood) => {
    setSelectedMood(mood)
    setIsLoadingMusic(true)
    try {
      const data = await getMusicRecommendation(mood)
      setMusicData(data)
    } catch (e) {
      setMusicData({
        playlist_name: `${mood.toUpperCase()} Energy Mix`,
        provider: 'youtube',
        embed_url: 'https://www.youtube.com/embed/videoseries?list=PLu0ocO48LFms5WsI1ipaeanxqRjn2fC_5'
      })
    } finally {
      setIsLoadingMusic(false)
      setIsPlaying(true)
    }
  }

  const handleChangeMusic = () => {
    setMusicData(null)
    setSelectedMood('')
  }

  return (
    <motion.div 
      className="grid-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div style={{ gridColumn: 'span 12', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Integrations</h1>
        <p className="text-muted">Connect your fitness ecosystem for unified intelligence.</p>
      </div>

      {/* Left Column: Device & Bot Sync */}
      <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
         <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
               <Watch size={18} />
               <h3 style={{ fontSize: '1.125rem' }}>Wearables</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ padding: '1rem', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Globe size={24} className="text-muted" />
                  <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Google Fit</div>
                     <div className="text-muted" style={{ fontSize: '0.75rem' }}>Sync steps and heart rate</div>
                  </div>
                  <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px' }}>Connect</button>
               </div>
               <div style={{ padding: '1rem', background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Smartphone size={24} className="text-muted" />
                  <div style={{ flex: 1 }}>
                     <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Apple Health</div>
                     <div className="text-muted" style={{ fontSize: '0.75rem' }}>iPhone & Apple Watch sync</div>
                  </div>
                  <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px' }}>Connect</button>
               </div>
            </div>
         </div>

         <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
               <Send size={18} />
               <h3 style={{ fontSize: '1.125rem' }}>Telegram Bot</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
               Receive daily streak reminders and detailed form analysis via Telegram. Factor health history into your chat.
            </p>
            <button className="btn-primary" style={{ width: '100%', borderRadius: '12px' }}>Enable Telegram Sync</button>
         </div>
      </div>

      {/* Right Column: Music Engine */}
      <div style={{ gridColumn: 'span 7' }}>
         <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Music size={18} className="text-muted" />
                  <h3 style={{ fontSize: '1.125rem' }}>Session Audio Hub</h3>
               </div>
               <AnimatePresence>
                 {musicData && (
                   <motion.button 
                     initial={{ opacity: 0, x: 10 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0 }}
                     onClick={handleChangeMusic}
                     className="text-muted" 
                     style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                   >
                     <RefreshCw size={14} /> Change Mood
                   </motion.button>
                 )}
               </AnimatePresence>
            </div>

            <AnimatePresence mode="wait">
              {!musicData ? (
                <motion.div 
                  key="mood-selector"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}
                >
                  {moods.map(m => {
                    const Icon = m.icon
                    return (
                      <button 
                        key={m.key}
                        onClick={() => handleGetPlaylist(m.key)}
                        disabled={isLoadingMusic}
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          gap: '1rem', 
                          padding: '2rem 1rem',
                          background: 'var(--surface-hover)',
                          border: '1px solid var(--border)',
                          borderRadius: '16px',
                          transition: 'all 0.2s ease',
                          color: 'var(--text-primary)'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--accent)'
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.background = 'var(--surface-hover)'
                        }}
                      >
                        <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                          <Icon size={24} className="text-muted" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{m.label}</div>
                          <div style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '4px' }}>{m.hint}</div>
                        </div>
                      </button>
                    )
                  })}
                </motion.div>
              ) : (
                <motion.div 
                  key="player-view"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                >
                  {/* Custom Spotify-like Controls */}
                  <div style={{ padding: '1.5rem', background: 'var(--surface-hover)', borderRadius: '24px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <div style={{ width: '80px', height: '80px', background: 'var(--bg)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <img 
                          src={`https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=200&q=80`} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} 
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{musicData.playlist_name}</div>
                        <div className="text-muted" style={{ fontSize: '0.815rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
                          <Activity size={12} style={{ color: 'var(--accent)' }} /> 
                          Optimized for {selectedMood}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
                       <button className="text-muted"><RefreshCw size={20} /></button>
                       <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        style={{ width: '56px', height: '56px', background: 'var(--accent)', color: 'var(--bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                       >
                         {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                       </button>
                       <button onClick={() => handleGetPlaylist(selectedMood)} className="text-muted"><SkipForward size={24} /></button>
                    </div>
                  </div>

                  {/* Embedded Player - No Redirects allowed */}
                  <div style={{ flex: 1, minHeight: '350px', background: '#000', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {isPlaying ? (
                      <iframe 
                        key={`${musicData.embed_url}-playing`}
                        src={`${musicData.embed_url}${musicData.embed_url.includes('?') ? '&' : '?'}autoplay=1&mute=0`} 
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        title="Music Player"
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050505', gap: '1rem' }}>
                         <div style={{ padding: '2rem', background: 'var(--surface)', borderRadius: '50%', border: '1px solid var(--border)' }}>
                            <Pause size={48} className="text-muted" />
                         </div>
                         <p className="text-muted" style={{ fontWeight: 600 }}>Audio Paused</p>
                         <button onClick={() => setIsPlaying(true)} className="btn-primary">Resume Session</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isLoadingMusic && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,5,0.8)', backdropFilter: 'blur(4px)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <Loader2 className="spinner" size={32} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em' }}>SYNCHRONIZING AUDIO...</span>
              </div>
            )}
         </div>
      </div>
    </motion.div>
  )
}
