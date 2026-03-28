import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, RotateCcw, Save, Play, Square, Activity, Target, Clock, Zap, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { saveWorkoutSession } from '../services/api'

const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
  [24, 26], [26, 28], [27, 31], [28, 32],
]

export default function RepCounter() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const poseLandmarkerRef = useRef(null)
  const lastVideoTimeRef = useRef(-1)
  const stageRef = useRef('Up')
  const lastRepAtRef = useRef(0)
  const angleHistoryRef = useRef([])

  const [isStreaming, setIsStreaming] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isPoseLoading, setIsPoseLoading] = useState(false)
  const [reps, setReps] = useState(0)
  const [targetReps, setTargetReps] = useState(20)
  const [exerciseMode, setExerciseMode] = useState('squat')
  const [lastAngle, setLastAngle] = useState(180)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [postureAdvice, setPostureAdvice] = useState('Position your body')
  const [userVisible, setUserVisible] = useState(false)
  const [error, setError] = useState('')
  const [setCompleteMessage, setSetCompleteMessage] = useState('')

  const normalizedTargetReps = Math.max(1, Number(targetReps) || 1)

  const calculateAngle = (pointA, pointB, pointC) => {
    if (!pointA || !pointB || !pointC) return 180
    const radians = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) - Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x)
    let degrees = Math.abs((radians * 180) / Math.PI)
    if (degrees > 180) degrees = 360 - degrees
    return degrees
  }

  const getSmoothedAngle = (newAngle) => {
    angleHistoryRef.current.push(newAngle)
    if (angleHistoryRef.current.length > 5) angleHistoryRef.current.shift()
    return angleHistoryRef.current.reduce((a, b) => a + b, 0) / angleHistoryRef.current.length
  }

  const drawPoseOverlay = (result) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const width = video.videoWidth || video.clientWidth
    const height = video.videoHeight || video.clientHeight
    if (!width || !height) return

    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height

    const context = canvas.getContext('2d')
    context.clearRect(0, 0, width, height)

    const landmarks = result?.landmarks?.[0]
    if (!landmarks) return

    context.lineWidth = 3
    context.strokeStyle = '#ffffff'

    POSE_CONNECTIONS.forEach(([startIndex, endIndex]) => {
      const start = landmarks[startIndex]
      const end = landmarks[endIndex]
      if (!start || !end || (start.visibility ?? 1) < 0.5 || (end.visibility ?? 1) < 0.5) return
      context.beginPath()
      context.moveTo(start.x * width, start.y * height)
      context.lineTo(end.x * width, end.y * height)
      context.stroke()
    })

    context.fillStyle = 'var(--accent)'
    landmarks.forEach((point) => {
      if (!point || (point.visibility ?? 1) < 0.5) return
      context.beginPath()
      context.arc(point.x * width, point.y * height, 4, 0, Math.PI * 2)
      context.fill()
    })
  }

  const getExerciseConfig = (mode) => {
    const map = {
      squat: { label: 'Squat', downThreshold: 110, upThreshold: 160, minRepInterval: 800 },
      pushup: { label: 'Push-up', downThreshold: 90, upThreshold: 150, minRepInterval: 700 },
      bicep_curl: { label: 'Bicep Curl', downThreshold: 150, upThreshold: 45, minRepInterval: 600 },
    }
    return map[mode] || map.squat
  }

  const getPostureAdvice = (mode, stage, angleDeg) => {
    const tips = {
      squat: {
        Down: [
          'Keep your back straight!',
          'Knees over toes — push them out',
          'Drive through your heels',
          'Core tight, chest up',
        ],
        Up: [
          'Go deeper — break parallel',
          'Lower slowly, control the eccentric',
          'Breathe in on the way down',
          'Keep weight in your heels',
        ],
      },
      pushup: {
        Down: [
          'Keep elbows close to body!',
          'Maintain a straight plank line',
          'Don\'t let hips sag',
          'Full range — chest to floor',
        ],
        Up: [
          'Push explosively on the way up',
          'Lock out your elbows at the top',
          'Breathe out as you push',
          'Shoulders back and down',
        ],
      },
      bicep_curl: [
        'Keep your elbow stationary!',
        'Full range of motion — go all the way',
        'Control the descent slowly',
        'Don\'t swing your body',
      ],
    }

    const pool = [
      ...(tips[mode]?.[stage] || []),
      ...(Array.isArray(tips[mode]) ? tips[mode] : []),
      'Great form — keep it up!',
    ]
    return pool[Math.floor((Date.now() / 4000)) % pool.length]
  }

  // Detection loop useEffect
  useEffect(() => {
    let animationId

    const detect = () => {
      if (!isStreaming || !poseLandmarkerRef.current || !videoRef.current) return

      const video = videoRef.current
      if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime

        try {
          const result = poseLandmarkerRef.current.detectForVideo(video, performance.now())
          if (result?.landmarks?.length) {
            setUserVisible(true)
            const landmarks = result.landmarks[0]
            const config = getExerciseConfig(exerciseMode)

            let activeAngle = 180
            if (exerciseMode === 'squat') {
              const leftVis = (landmarks[23]?.visibility ?? 0) + (landmarks[25]?.visibility ?? 0) + (landmarks[27]?.visibility ?? 0)
              const rightVis = (landmarks[24]?.visibility ?? 0) + (landmarks[26]?.visibility ?? 0) + (landmarks[28]?.visibility ?? 0)
              activeAngle = leftVis > rightVis
                ? calculateAngle(landmarks[23], landmarks[25], landmarks[27])
                : calculateAngle(landmarks[24], landmarks[26], landmarks[28])
            } else {
              const leftVis = (landmarks[11]?.visibility ?? 0) + (landmarks[13]?.visibility ?? 0) + (landmarks[15]?.visibility ?? 0)
              const rightVis = (landmarks[12]?.visibility ?? 0) + (landmarks[14]?.visibility ?? 0) + (landmarks[16]?.visibility ?? 0)
              activeAngle = leftVis > rightVis
                ? calculateAngle(landmarks[11], landmarks[13], landmarks[15])
                : calculateAngle(landmarks[12], landmarks[14], landmarks[16])
            }

            const smoothed = getSmoothedAngle(activeAngle)
            setLastAngle(Math.round(smoothed))

            // Counting logic
            if (exerciseMode === 'bicep_curl') {
              if (smoothed > config.downThreshold) stageRef.current = 'Down'
              if (smoothed < config.upThreshold && stageRef.current === 'Down') {
                if (Date.now() - lastRepAtRef.current > config.minRepInterval) {
                  setReps(r => Math.min(normalizedTargetReps, r + 1))
                  lastRepAtRef.current = Date.now()
                  stageRef.current = 'Up'
                }
              }
            } else {
              if (smoothed < config.downThreshold) stageRef.current = 'Down'
              if (smoothed > config.upThreshold && stageRef.current === 'Down') {
                if (Date.now() - lastRepAtRef.current > config.minRepInterval) {
                  setReps(r => Math.min(normalizedTargetReps, r + 1))
                  lastRepAtRef.current = Date.now()
                  stageRef.current = 'Up'
                }
              }
            }
            drawPoseOverlay(result)
            setPostureAdvice(getPostureAdvice(exerciseMode, stageRef.current, Math.round(smoothed)))
          } else {
            setUserVisible(false)
            setPostureAdvice('User not detected')
          }
        } catch (e) {
          console.error("Detection error:", e)
        }
      }
      animationId = requestAnimationFrame(detect)
    }

    if (isStreaming) {
      animationId = requestAnimationFrame(detect)
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [isStreaming, exerciseMode, normalizedTargetReps])

  const startCamera = async () => {
    setIsStarting(true)
    setError('')
    setSetCompleteMessage('')
    setSessionSeconds(0)
    setReps(0)
    stageRef.current = 'Up'
    angleHistoryRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream

      if (!poseLandmarkerRef.current) {
        setIsPoseLoading(true)
        const vision = await import('@mediapipe/tasks-vision')
        const fileset = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm')
        poseLandmarkerRef.current = await vision.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numPoses: 1
        })
        setIsPoseLoading(false)
      }
      setIsStreaming(true)
    } catch (e) {
      setError('Camera access denied or hardware not found.')
      console.error(e)
    } finally {
      setIsStarting(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    setIsStreaming(false)
    setUserVisible(false)
  }

  useEffect(() => {
    if (!isStreaming) return
    if (reps < normalizedTargetReps) return

    stopCamera()
    setPostureAdvice(`Set complete! ${normalizedTargetReps} reps done.`)
    setSetCompleteMessage(`Set complete! You reached ${normalizedTargetReps} reps.`)
  }, [isStreaming, reps, normalizedTargetReps])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const exerciseName = getExerciseConfig(exerciseMode).label
      await saveWorkoutSession({
        exercise_name: exerciseName,
        reps,
        duration_minutes: Math.floor(sessionSeconds / 60),
        form_score: 95,
        calories_burned: reps * 4
      })

      // Sync with Dashboard AI Workout Tasks
      try {
        const stored = localStorage.getItem('arize_today_workout_tasks_v1')
        if (stored) {
          let tasks = JSON.parse(stored)
          let updated = false
          tasks = tasks.map(t => {
            if (!t.done && t.title.toLowerCase().includes(exerciseName.toLowerCase().replace('-', '')) && reps >= (t.reps || 1)) {
              updated = true
              return { ...t, done: true }
            }
            return t
          })
          if (updated) {
            localStorage.setItem('arize_today_workout_tasks_v1', JSON.stringify(tasks))
            window.dispatchEvent(new Event('arize_tasks_updated'))
          }
        }
      } catch (e) {
        console.error('Failed to sync tasks', e)
      }

      alert('Workout session synchronized! Dashboard updated.')
    } catch (e) {
      alert('Failed to save session.')
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    let interval
    if (isStreaming) {
      const start = Date.now()
      interval = setInterval(() => {
        setSessionSeconds(Math.floor((Date.now() - start) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isStreaming])

  return (
    <motion.div
      className="grid-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div style={{ gridColumn: 'span 12', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Workout Coach</h1>
        <p className="text-muted">Real-time AI-powered rep counting with posture coaching.</p>
      </div>

      {/* Main Viewport */}
      <div className="card" style={{ gridColumn: 'span 8', padding: 0, overflow: 'hidden', position: 'relative', background: '#000', minHeight: '540px', borderRadius: '24px' }}>
        <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }} />

        {!isStreaming && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', background: 'rgba(5,5,5,0.9)', backdropFilter: 'blur(10px)' }}>
            <div style={{ padding: '2rem', background: 'var(--surface)', borderRadius: '50%', border: '1px solid var(--border)' }}>
              <Camera size={48} strokeWidth={1} className="text-muted" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Camera Stream Required</h3>
              <p className="text-muted" style={{ maxWidth: '300px' }}>Position your device to see your full body for accurate tracking.</p>
            </div>
            <button onClick={startCamera} className="btn-primary" style={{ height: '3.5rem', padding: '0 2.5rem', borderRadius: '12px' }}>
              {isStarting ? 'System Initializing...' : 'Activate Camera'}
            </button>
            {error && <div style={{ color: '#ef4444', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={16} /> {error}</div>}
          </div>
        )}

        {isPoseLoading && (
          <div style={{ position: 'absolute', top: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', border: '1px solid var(--border)', padding: '0.75rem 1.5rem', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 10 }}>
            <Loader2 className="spinner" size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Loading AI Vision Engine...</span>
          </div>
        )}

        {isStreaming && (
          <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', right: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pointerEvents: 'none' }}>
            <div style={{ background: 'rgba(5,5,5,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.25rem 2rem', borderRadius: '20px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.1em' }}>Reps Completed</div>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1 }}>{reps}</div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '1rem', width: '120px' }}>
                <div style={{ width: `${Math.min(100, (reps / normalizedTargetReps) * 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: '2px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ background: userVisible ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)', border: `1px solid ${userVisible ? '#4ade80' : '#ef4444'}`, padding: '0.5rem 1rem', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', background: userVisible ? '#4ade80' : '#ef4444', borderRadius: '50%' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: userVisible ? '#4ade80' : '#ef4444' }}>
                  {userVisible ? 'Vision Active' : 'User Out of View'}
                </span>
              </div>
              <div style={{ background: 'var(--accent)', color: 'var(--bg)', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 800, fontSize: '0.875rem', textTransform: 'uppercase' }}>
                {postureAdvice}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ borderRadius: '24px' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>Session Logic</h3>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '1rem', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
            💡 Coach guides you in real-time during your session
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {setCompleteMessage && (
              <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(74,222,128,0.45)', background: 'rgba(74,222,128,0.12)' }}>
                {setCompleteMessage}
              </div>
            )}
            <div>
              <label className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>Tracking Target</label>
              <select
                value={exerciseMode}
                onChange={e => { setExerciseMode(e.target.value); setReps(0); setSetCompleteMessage(''); }}
                style={{ width: '100%', background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '1rem', color: '#fff', borderRadius: '12px', fontSize: '0.935rem' }}
              >
                <option value="squat">Squats (Hip/Knee)</option>
                <option value="pushup">Push-ups (Shoulder/Elbow)</option>
                <option value="bicep_curl">Bicep Curls (Elbow/Wrist)</option>
              </select>
            </div>
            <div>
              <label className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>Daily Goal</label>
              <input
                type="number"
                value={targetReps}
                onChange={e => setTargetReps(Math.max(1, Number(e.target.value) || 1))}
                style={{ width: '100%', background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '1rem', color: '#fff', borderRadius: '12px', fontSize: '0.935rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {isStreaming ? (
                <button onClick={stopCamera} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '3.5rem', borderRadius: '12px' }}>
                  <Square size={18} /> End Stream
                </button>
              ) : (
                <button onClick={startCamera} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '3.5rem', borderRadius: '12px' }}>
                  <Play size={18} fill="currentColor" /> Start AI
                </button>
              )}
              <button onClick={handleSave} disabled={reps === 0 || isSaving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '3.5rem', borderRadius: '12px' }}>
                <Save size={18} /> Sync Data
              </button>
            </div>
            <button onClick={() => { setReps(0); setSetCompleteMessage(''); }} className="text-muted" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <RotateCcw size={12} /> Clear Current Count
            </button>
          </div>
        </div>

        {/* Live Metrics */}
        <div className="card" style={{ borderRadius: '24px' }}>
          <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }} className="text-muted">
            Biometric Feed
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ padding: '1.25rem', background: 'var(--surface-hover)', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Joint Angle</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{lastAngle}°</div>
            </div>
            <div style={{ padding: '1.25rem', background: 'var(--surface-hover)', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Session</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{Math.floor(sessionSeconds / 60)}:{String(sessionSeconds % 60).padStart(2, '0')}</div>
            </div>
            <div style={{ padding: '1.25rem', background: 'var(--surface-hover)', borderRadius: '16px', border: '1px solid var(--border)', gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>Target Accuracy</div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)' }}>{Math.min(100, Math.round((reps / normalizedTargetReps) * 100))}%</span>
              </div>
              <div style={{ height: '6px', background: 'var(--bg)', borderRadius: '3px', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (reps / normalizedTargetReps) * 100)}%` }}
                  style={{ height: '100%', background: 'var(--accent)', borderRadius: '3px' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
