import { useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Camera, 
  Activity, 
  Timer, 
  ArrowRight, 
  Upload, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  PlayCircle,
  FileVideo,
  X,
  RefreshCw
} from 'lucide-react'
import { getExerciseData, GYM_TOPICS } from '../services/wikipediaApi'
import { analyzeWorkoutVideo, fetchWorkoutSummary } from '../services/api'

export default function ComputerVision() {
  const [exerciseCards, setExerciseCards] = useState([])
  const [exerciseLoading, setExerciseLoading] = useState(true)
  const [videoFile, setVideoFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoDuration, setVideoDuration] = useState(0)
  const [exerciseName, setExerciseName] = useState('Workout Session')
  const [videoAnalysis, setVideoAnalysis] = useState(null)
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoError, setVideoError] = useState('')
  const [cameraStatus, setCameraStatus] = useState('idle')
  const [latencyMs, setLatencyMs] = useState(null)
  const [setupGuideOpen, setSetupGuideOpen] = useState(false)
  const [workoutSummary, setWorkoutSummary] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const fallbackExercises = useMemo(() => (
    (GYM_TOPICS?.exercises || []).slice(0, 5).map((item) => item.name)
  ), [])
  const defaultExerciseImage = 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=1200&q=80'

  const supportedExerciseCount = useMemo(() => {
    if (exerciseCards.length) return exerciseCards.length
    return fallbackExercises.length || 0
  }, [exerciseCards, fallbackExercises])

  const formSignal = useMemo(() => {
    if (videoAnalysis?.form_score != null) return Math.round(videoAnalysis.form_score)
    if (workoutSummary?.avg_form_score != null) return Math.round(workoutSummary.avg_form_score)
    return null
  }, [videoAnalysis, workoutSummary])

  useEffect(() => {
    let mounted = true
    async function loadExerciseImages() {
      setExerciseLoading(true)
      const data = await getExerciseData()
      if (!mounted) return
      if (Array.isArray(data) && data.length) {
        setExerciseCards(data.slice(0, 5))
      } else {
        setExerciseCards([])
      }
      setExerciseLoading(false)
    }
    loadExerciseImages()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    async function loadWorkoutSummary() {
      try {
        const summary = await fetchWorkoutSummary()
        if (mounted) setWorkoutSummary(summary)
      } catch {
        if (mounted) setWorkoutSummary({ total_sessions: 0, avg_form_score: 0, guest_mode: true })
      }
    }
    loadWorkoutSummary()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl) }
  }, [videoUrl])

  const processFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setVideoError('Please upload a valid video file.')
      return
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    const localUrl = URL.createObjectURL(file)
    setVideoFile(file)
    setVideoUrl(localUrl)
    setVideoDuration(0)
    setVideoAnalysis(null)
    setVideoError('')
  }

  const handleVideoSelect = (event) => {
    const file = event.target.files?.[0]
    processFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    processFile(file)
  }

  const clearVideo = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoFile(null)
    setVideoUrl('')
    setVideoAnalysis(null)
    setVideoError('')
  }

  const runVideoAnalysis = async () => {
    if (!videoFile) {
      setVideoError('Upload a workout video first.')
      return
    }
    setVideoLoading(true)
    setVideoError('')
    setVideoAnalysis(null)
    try {
      const result = await analyzeWorkoutVideo(videoFile, {
        exercise_name: exerciseName,
        duration_seconds: videoDuration,
      })
      setVideoAnalysis(result?.analysis || null)
      const summary = await fetchWorkoutSummary().catch(() => null)
      if (summary) setWorkoutSummary(summary)
    } catch (error) {
      setVideoError(error.message || 'Video analysis failed. Please try again.')
    } finally {
      setVideoLoading(false)
    }
  }

  const handleCameraTest = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unsupported')
      setVideoError('Camera API is not supported in this browser.')
      return
    }
    setCameraStatus('checking')
    setVideoError('')
    const start = performance.now()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      const latency = Math.round(performance.now() - start)
      setLatencyMs(latency)
      setCameraStatus('ready')
      stream.getTracks().forEach((track) => track.stop())
    } catch {
      setCameraStatus('blocked')
      setLatencyMs(null)
      setVideoError('Camera permission blocked.')
    }
  }

  return (
    <motion.div 
      className="grid-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div style={{ gridColumn: 'span 12', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Computer Vision</h1>
        <p className="text-muted">Real-time pose estimation and visual movement analysis.</p>
      </div>

      {/* Hero / System Status */}
      <div className="card" style={{ gridColumn: 'span 12', background: 'var(--accent)', color: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Ready for Live Tracking?</h2>
            <p style={{ fontSize: '0.875rem', opacity: 0.8, maxWidth: '600px', marginBottom: '1.5rem' }}>
               Verify your environment and camera setup to enable 60 FPS real-time rep counting and form feedback.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
               <Link to="/counter" className="btn-primary" style={{ background: 'var(--bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PlayCircle size={18} /> Launch Counter
               </Link>
               <button onClick={handleCameraTest} className="btn-secondary" style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.2)', color: 'var(--bg)' }}>
                  {cameraStatus === 'checking' ? 'Testing...' : 'Run Diagnostics'}
               </button>
            </div>
         </div>
         <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.05)', borderRadius: 'var(--radius)', border: '1px solid rgba(0,0,0,0.1)', minWidth: '240px' }}>
            <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--bg)', opacity: 0.6, marginBottom: '1rem' }}>System Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 600 }}>
                  <span>Camera</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                     {cameraStatus === 'ready' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} 
                     {cameraStatus === 'ready' ? 'Ready' : 'Not Setup'}
                  </span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 600 }}>
                  <span>Pose Model</span>
                  <span>{cameraStatus === 'ready' ? 'Active' : 'Standby'}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 600 }}>
                  <span>Latency</span>
                  <span>{latencyMs ? `${latencyMs}ms` : '--'}</span>
               </div>
            </div>
         </div>
      </div>

      {/* Main Feature Cards */}
      <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
         {/* Live Rep Counting Overview */}
         <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Activity size={18} />
                  <h3 style={{ fontSize: '1.125rem' }}>Live Session Engine</h3>
               </div>
               <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.25rem 0.5rem', background: 'var(--surface-hover)', borderRadius: '2px' }}>
                  MediaPipe Pose
               </span>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
               Our core vision engine tracks 33 body landmarks to calculate joint angles and movement velocity.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
               <div style={{ padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Skeleton Overlay</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Real-time 2D joint mapping</div>
               </div>
               <div style={{ padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Phase Detection</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Eccentric/Concentric tracking</div>
               </div>
            </div>
            <button onClick={() => setSetupGuideOpen(!setupGuideOpen)} className="btn-secondary" style={{ width: '100%' }}>
               {setupGuideOpen ? 'Hide Integration Guide' : 'View Placement Guide'}
            </button>
            {setupGuideOpen && (
               <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
                  <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                     <li>Ensure full body visibility (head to toe).</li>
                     <li>Lateral view is best for Squats and Push-ups.</li>
                     <li>Maintain 6-8 feet distance from the camera.</li>
                  </ul>
               </div>
            )}
         </div>

         {/* Video Analysis Upload with Drop Section */}
         <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
               <Upload size={18} />
               <h3 style={{ fontSize: '1.125rem' }}>Deep Video Analysis</h3>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
               <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Exercise Type</label>
               <input 
                  value={exerciseName} 
                  onChange={e => setExerciseName(e.target.value)}
                  placeholder="e.g. Squats"
                  style={{ width: '100%', background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '0.75rem', color: 'var(--text-primary)', borderRadius: 'var(--radius)' }}
               />
            </div>

            <div 
               onDragOver={handleDragOver}
               onDragLeave={handleDragLeave}
               onDrop={handleDrop}
               onClick={() => fileInputRef.current?.click()}
               style={{ 
                  border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  background: isDragging ? 'rgba(255,255,255,0.05)' : 'var(--surface-hover)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  marginBottom: '1.5rem'
               }}
            >
               <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="video/*" 
                  onChange={handleVideoSelect}
                  style={{ display: 'none' }}
               />
               
               <AnimatePresence mode="wait">
                  {!videoUrl ? (
                     <motion.div 
                        key="empty"
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
                     >
                        <FileVideo size={48} strokeWidth={1} className="text-muted" />
                        <div>
                           <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>Drop workout clip here</div>
                           <div className="text-muted" style={{ fontSize: '0.875rem' }}>or click to browse from device</div>
                        </div>
                     </motion.div>
                  ) : (
                     <motion.div 
                        key="preview"
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ width: '100%' }}
                     >
                        <div style={{ position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                           <video src={videoUrl} controls style={{ width: '100%', maxHeight: '300px', display: 'block' }} />
                           <button 
                              onClick={(e) => { e.stopPropagation(); clearVideo(); }}
                              style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '50%', color: '#fff' }}
                           >
                              <X size={16} />
                           </button>
                        </div>
                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 600 }}>
                           <RefreshCw size={14} /> Change Video
                        </div>
                     </motion.div>
                  )}
               </AnimatePresence>
            </div>

            {videoError && (
               <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius)', color: '#ef4444', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} /> {videoError}
               </div>
            )}

            <button onClick={runVideoAnalysis} disabled={videoLoading || !videoFile} className="btn-primary" style={{ width: '100%' }}>
               {videoLoading ? 'Processing Visual Data...' : 'Analyze Recording'}
            </button>

            {videoAnalysis && (
               <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                     <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Form</div>
                     <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{videoAnalysis.form_score}%</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                     <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Reps</div>
                     <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{videoAnalysis.estimated_reps}</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                     <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Burn</div>
                     <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{videoAnalysis.calories_burned}kcal</div>
                  </div>
               </div>
            )}
         </div>
      </div>

      {/* Right Column: Knowledge & Stats */}
      <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
         <div className="card">
            <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }} className="text-muted">
               Detection Coverage
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {exerciseLoading ? (
                  <div className="spinner" style={{ margin: '1rem auto' }} />
               ) : exerciseCards.map(ex => (
                  <div key={ex.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                     <img 
                        src={ex.thumbnail || defaultExerciseImage} 
                        style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} 
                        onError={e => e.target.src = defaultExerciseImage}
                     />
                     <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{ex.name}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Full motion tracking enabled</div>
                     </div>
                     <ShieldCheck size={16} className="text-muted" />
                  </div>
               ))}
            </div>
         </div>

         <div className="card" style={{ background: 'var(--surface-hover)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
               <Timer size={18} className="text-muted" />
               <h3 style={{ fontSize: '1.125rem' }}>Historical Form</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
               <div style={{ fontSize: '2rem', fontWeight: 800 }}>{formSignal || '--'}%</div>
               <div className="text-muted" style={{ fontSize: '0.75rem' }}>Average Accuracy</div>
            </div>
            <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
               <div style={{ width: `${formSignal || 0}%`, height: '100%', background: 'var(--accent)', borderRadius: '2px' }} />
            </div>
         </div>

         <div className="card">
            <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }} className="text-muted">
               CV Roadmap
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
               Coming soon: Multi-person tracking, 3D skeletal reconstruction, and automated equipment detection.
            </p>
         </div>
      </div>
    </motion.div>
  )
}
