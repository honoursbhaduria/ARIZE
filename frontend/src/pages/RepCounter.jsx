import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Minus, Play, Plus, RotateCcw, Save, Square, Trophy } from 'lucide-react'
import { logActivity } from '../services/activityFeed'
import { useSaveWorkout } from '../lib/queries'
import { completeTasksForSession } from '../lib/workoutTasks'
import { Alert, Badge, Button, Card, CardHeader, PageHeader, ProgressBar, Stat } from '../ui/components'
import { useToast } from '../ui/toast-context'
import './RepCounter.css'

const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
  [24, 26], [26, 28], [27, 31], [28, 32],
]

const EXERCISES = [
  { value: 'squat', label: 'Squats', joints: 'Hip / knee' },
  { value: 'pushup', label: 'Push-ups', joints: 'Shoulder / elbow' },
  { value: 'bicep_curl', label: 'Bicep curls', joints: 'Elbow / wrist' },
]

const EXERCISE_CONFIG = {
  squat: { label: 'Squat', downThreshold: 110, upThreshold: 160, minRepInterval: 800, requiredDepth: 108, requiredExtension: 158 },
  pushup: { label: 'Push-up', downThreshold: 90, upThreshold: 150, minRepInterval: 700, requiredDepth: 92, requiredExtension: 150 },
  bicep_curl: { label: 'Bicep Curl', downThreshold: 150, upThreshold: 45, minRepInterval: 600, requiredDepth: 60, requiredExtension: 150 },
}

const getExerciseConfig = (mode) => EXERCISE_CONFIG[mode] || EXERCISE_CONFIG.squat

function calculateAngle(pointA, pointB, pointC) {
  if (!pointA || !pointB || !pointC) return 180
  const radians = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) - Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x)
  let degrees = Math.abs((radians * 180) / Math.PI)
  if (degrees > 180) degrees = 360 - degrees
  return degrees
}

function getLiveFormFeedback(mode, stage, angleDeg, config, bicepState = null) {
  if (mode === 'bicep_curl') {
    if (!bicepState?.bothArmsVisible) return { valid: false, message: 'Show both arms clearly for bicep curl counting.' }
    if (bicepState?.oneArmCurledOnly) return { valid: false, message: 'One-arm curl detected. Curl both arms together.' }
    if (stage === 'Down' && angleDeg < config.requiredExtension) return { valid: false, message: 'Open your arm fully before curling.' }
    if (stage === 'Up' && angleDeg > config.requiredDepth) return { valid: false, message: 'Curl higher. Squeeze at the top.' }
    return { valid: true, message: 'Good curl control. Keep elbow stable.' }
  }
  if (stage === 'Down' && angleDeg > config.requiredDepth) {
    return { valid: false, message: mode === 'squat' ? 'Go lower. Hit proper squat depth.' : 'Lower more. Chest should approach floor.' }
  }
  if (stage === 'Up' && angleDeg < config.requiredExtension) {
    return { valid: false, message: mode === 'squat' ? 'Stand tall at the top to finish the rep.' : 'Lock out the top to finish the rep.' }
  }
  return { valid: true, message: mode === 'squat' ? 'Depth and lockout look good.' : 'Range looks clean. Keep control.' }
}

const POSTURE_TIPS = {
  squat: {
    Down: ['Keep your back straight!', 'Knees over toes - push them out', 'Drive through your heels', 'Core tight, chest up'],
    Up: ['Go deeper - break parallel', 'Lower slowly, control the eccentric', 'Breathe in on the way down', 'Keep weight in your heels'],
  },
  pushup: {
    Down: ['Keep elbows close to body!', 'Maintain a straight plank line', 'Do not let hips sag', 'Full range - chest to floor'],
    Up: ['Push explosively on the way up', 'Lock out your elbows at the top', 'Breathe out as you push', 'Shoulders back and down'],
  },
  bicep_curl: ['Keep your elbow stationary!', 'Full range of motion - go all the way', 'Control the descent slowly', 'Do not swing your body'],
}

function getPostureAdvice(mode, stage) {
  const tips = POSTURE_TIPS[mode]
  const pool = [...(tips?.[stage] || []), ...(Array.isArray(tips) ? tips : []), 'Great form - keep it up!']
  return pool[Math.floor(Date.now() / 4000) % pool.length]
}

// Canvas cannot read CSS variables, so colours are literal here.
function drawPoseOverlay(canvas, video, landmarks) {
  if (!canvas || !video) return
  const width = video.videoWidth || video.clientWidth
  const height = video.videoHeight || video.clientHeight
  if (!width || !height) return
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height

  const context = canvas.getContext('2d')
  context.clearRect(0, 0, width, height)
  if (!landmarks) return

  context.lineWidth = 4
  context.strokeStyle = '#8b6cff'
  POSE_CONNECTIONS.forEach(([startIndex, endIndex]) => {
    const start = landmarks[startIndex]
    const end = landmarks[endIndex]
    if (!start || !end || (start.visibility ?? 1) < 0.5 || (end.visibility ?? 1) < 0.5) return
    context.beginPath()
    context.moveTo(start.x * width, start.y * height)
    context.lineTo(end.x * width, end.y * height)
    context.stroke()
  })

  context.fillStyle = '#ffc83d'
  landmarks.forEach((point) => {
    if (!point || (point.visibility ?? 1) < 0.5) return
    context.beginPath()
    context.arc(point.x * width, point.y * height, 5, 0, Math.PI * 2)
    context.fill()
  })
}

export default function RepCounter() {
  const toast = useToast()
  const saveWorkout = useSaveWorkout()

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const poseLandmarkerRef = useRef(null)
  const lastVideoTimeRef = useRef(-1)
  const stageRef = useRef('Up')
  const lastRepAtRef = useRef(0)
  const angleHistoryRef = useRef([])
  const repDepthReachedRef = useRef(false)
  const repExtensionReachedRef = useRef(false)
  const completionLoggedRef = useRef(false)
  const motionMinAngleRef = useRef(180)
  const motionMaxAngleRef = useRef(0)

  const [isStreaming, setIsStreaming] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isPoseLoading, setIsPoseLoading] = useState(false)
  const [reps, setReps] = useState(0)
  const [targetReps, setTargetReps] = useState(20)
  const [exerciseMode, setExerciseMode] = useState('squat')
  const [lastAngle, setLastAngle] = useState(180)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [postureAdvice, setPostureAdvice] = useState('Position your body')
  const [userVisible, setUserVisible] = useState(false)
  const [error, setError] = useState('')
  const [setComplete, setSetComplete] = useState(false)
  const [invalidReps, setInvalidReps] = useState(0)
  const [isFormCorrect, setIsFormCorrect] = useState(true)

  const normalizedTargetReps = Math.max(1, Number(targetReps) || 1)
  const progressPct = Math.min(100, (reps / normalizedTargetReps) * 100)

  // Pose detection loop (logic unchanged from the original counter).
  useEffect(() => {
    let animationId

    const getSmoothedAngle = (newAngle) => {
      angleHistoryRef.current.push(newAngle)
      if (angleHistoryRef.current.length > 5) angleHistoryRef.current.shift()
      return angleHistoryRef.current.reduce((a, b) => a + b, 0) / angleHistoryRef.current.length
    }

    const detect = () => {
      if (!isStreaming || !poseLandmarkerRef.current || !videoRef.current) return
      const video = videoRef.current

      if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime
        try {
          const result = poseLandmarkerRef.current.detectForVideo(video, performance.now())
          const landmarks = result?.landmarks?.[0]
          const config = getExerciseConfig(exerciseMode)

          if (landmarks) {
            setUserVisible(true)
            let activeAngle = 180
            let bicepState = null

            if (exerciseMode === 'squat') {
              const leftVis = (landmarks[23]?.visibility ?? 0) + (landmarks[25]?.visibility ?? 0) + (landmarks[27]?.visibility ?? 0)
              const rightVis = (landmarks[24]?.visibility ?? 0) + (landmarks[26]?.visibility ?? 0) + (landmarks[28]?.visibility ?? 0)
              activeAngle = leftVis > rightVis
                ? calculateAngle(landmarks[23], landmarks[25], landmarks[27])
                : calculateAngle(landmarks[24], landmarks[26], landmarks[28])
            } else if (exerciseMode === 'pushup') {
              const leftVis = (landmarks[11]?.visibility ?? 0) + (landmarks[13]?.visibility ?? 0) + (landmarks[15]?.visibility ?? 0)
              const rightVis = (landmarks[12]?.visibility ?? 0) + (landmarks[14]?.visibility ?? 0) + (landmarks[16]?.visibility ?? 0)
              activeAngle = leftVis > rightVis
                ? calculateAngle(landmarks[11], landmarks[13], landmarks[15])
                : calculateAngle(landmarks[12], landmarks[14], landmarks[16])
            } else {
              const leftArmVisible = (landmarks[11]?.visibility ?? 0) > 0.55 && (landmarks[13]?.visibility ?? 0) > 0.55 && (landmarks[15]?.visibility ?? 0) > 0.55
              const rightArmVisible = (landmarks[12]?.visibility ?? 0) > 0.55 && (landmarks[14]?.visibility ?? 0) > 0.55 && (landmarks[16]?.visibility ?? 0) > 0.55
              const leftAngle = calculateAngle(landmarks[11], landmarks[13], landmarks[15])
              const rightAngle = calculateAngle(landmarks[12], landmarks[14], landmarks[16])
              const bothArmsVisible = leftArmVisible && rightArmVisible
              bicepState = {
                bothArmsVisible,
                bothExtended: bothArmsVisible && leftAngle > config.requiredExtension && rightAngle > config.requiredExtension,
                bothCurled: bothArmsVisible && leftAngle < config.requiredDepth && rightAngle < config.requiredDepth,
                oneArmCurledOnly: bothArmsVisible && (
                  (leftAngle < config.upThreshold && rightAngle >= config.upThreshold) ||
                  (rightAngle < config.upThreshold && leftAngle >= config.upThreshold)
                ),
              }
              activeAngle = bothArmsVisible ? (leftAngle + rightAngle) / 2 : Math.max(leftAngle, rightAngle)
            }

            const smoothed = getSmoothedAngle(activeAngle)
            setLastAngle(Math.round(smoothed))
            motionMinAngleRef.current = Math.min(motionMinAngleRef.current, smoothed)
            motionMaxAngleRef.current = Math.max(motionMaxAngleRef.current, smoothed)

            if (exerciseMode === 'bicep_curl') {
              if (smoothed > config.requiredExtension) repExtensionReachedRef.current = true
              if (bicepState?.bothExtended) {
                stageRef.current = 'Down'
                repExtensionReachedRef.current = true
              }
              const oneHandAttempt = !!bicepState?.oneArmCurledOnly
              const validDualCurlAttempt = !!bicepState?.bothCurled

              if ((oneHandAttempt || validDualCurlAttempt) && stageRef.current === 'Down' && Date.now() - lastRepAtRef.current > config.minRepInterval) {
                const rangeFallbackOk = motionMaxAngleRef.current - motionMinAngleRef.current >= 32
                if (validDualCurlAttempt && (repExtensionReachedRef.current || rangeFallbackOk)) {
                  setReps((value) => Math.min(normalizedTargetReps, value + 1))
                  setIsFormCorrect(true)
                } else {
                  setInvalidReps((value) => value + 1)
                  setIsFormCorrect(false)
                  setPostureAdvice(oneHandAttempt ? 'Rep not counted: use both arms together.' : 'Rep not counted: fully extend both arms first.')
                }
                lastRepAtRef.current = Date.now()
                stageRef.current = 'Up'
                repExtensionReachedRef.current = false
                motionMinAngleRef.current = 180
                motionMaxAngleRef.current = 0
              }
            } else {
              if (smoothed < config.requiredDepth) repDepthReachedRef.current = true
              if (smoothed < config.downThreshold) stageRef.current = 'Down'

              if (smoothed > config.upThreshold && stageRef.current === 'Down' && Date.now() - lastRepAtRef.current > config.minRepInterval) {
                const rangeFallbackOk = motionMaxAngleRef.current - motionMinAngleRef.current >= 28
                if (repDepthReachedRef.current || rangeFallbackOk) {
                  setReps((value) => Math.min(normalizedTargetReps, value + 1))
                  setIsFormCorrect(true)
                } else {
                  setInvalidReps((value) => value + 1)
                  setIsFormCorrect(false)
                  setPostureAdvice(exerciseMode === 'squat' ? 'Rep not counted: go lower before standing up.' : 'Rep not counted: lower deeper before pressing up.')
                }
                lastRepAtRef.current = Date.now()
                stageRef.current = 'Up'
                repDepthReachedRef.current = false
                motionMinAngleRef.current = 180
                motionMaxAngleRef.current = 0
              }
            }

            drawPoseOverlay(canvasRef.current, video, landmarks)
            const liveFeedback = getLiveFormFeedback(exerciseMode, stageRef.current, Math.round(smoothed), config, bicepState)
            setIsFormCorrect(liveFeedback.valid)
            setPostureAdvice(liveFeedback.valid ? getPostureAdvice(exerciseMode, stageRef.current) : liveFeedback.message)
          } else {
            setUserVisible(false)
            setIsFormCorrect(false)
            setPostureAdvice('User not detected')
            drawPoseOverlay(canvasRef.current, video, null)
          }
        } catch (e) {
          console.error('Detection error:', e)
        }
      }
      animationId = requestAnimationFrame(detect)
    }

    if (isStreaming) animationId = requestAnimationFrame(detect)
    return () => {
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [isStreaming, exerciseMode, normalizedTargetReps])

  // Target reached
  useEffect(() => {
    if (!isStreaming || reps < normalizedTargetReps || completionLoggedRef.current) return
    completionLoggedRef.current = true
    setSetComplete(true)
    setPostureAdvice(`Set complete! ${normalizedTargetReps} reps done.`)
    logActivity({
      source: 'Rep Counter',
      action: 'Target completed',
      details: `${getExerciseConfig(exerciseMode).label}: ${normalizedTargetReps} reps finished.`,
      meta: { exerciseMode, reps: normalizedTargetReps },
    })
  }, [isStreaming, reps, normalizedTargetReps, exerciseMode])

  // Session timer
  useEffect(() => {
    if (!isStreaming) return undefined
    const start = Date.now()
    const interval = setInterval(() => setSessionSeconds(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(interval)
  }, [isStreaming])

  // Always release the camera when leaving the page.
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])

  const startCamera = async () => {
    setIsStarting(true)
    setError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream

      if (!poseLandmarkerRef.current) {
        setIsPoseLoading(true)
        const vision = await import('@mediapipe/tasks-vision')
        const fileset = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm')
        poseLandmarkerRef.current = await vision.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        })
        setIsPoseLoading(false)
      }
      setSessionSeconds(0)
      setIsStreaming(true)
    } catch (e) {
      console.error(e)
      setIsPoseLoading(false)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      setError(e?.message === 'unsupported' ? 'This browser does not support camera access.' : 'Camera access denied or no camera found.')
    } finally {
      setIsStarting(false)
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    setIsStreaming(false)
    setUserVisible(false)
  }

  const resetCount = () => {
    setReps(0)
    setInvalidReps(0)
    setSetComplete(false)
    setLastAngle(180)
    setPostureAdvice('Position your body')
    setIsFormCorrect(true)
    stageRef.current = 'Up'
    lastRepAtRef.current = 0
    angleHistoryRef.current = []
    repDepthReachedRef.current = false
    repExtensionReachedRef.current = false
    completionLoggedRef.current = false
    motionMinAngleRef.current = 180
    motionMaxAngleRef.current = 0
  }

  const handleSave = () => {
    if (reps === 0) {
      toast.error('No reps recorded yet.')
      return
    }
    const exerciseName = getExerciseConfig(exerciseMode).label
    const durationMinutes = Math.floor(sessionSeconds / 60)
    saveWorkout.mutate(
      { exercise_name: exerciseName, reps, duration_minutes: durationMinutes, form_score: isFormCorrect ? 95 : 75, calories_burned: reps * 4 },
      {
        onSuccess: () => {
          const questDone = completeTasksForSession(exerciseName, reps)
          logActivity({
            source: 'Rep Counter',
            action: 'Workout synced',
            details: `${exerciseName} saved with ${reps} reps in ${durationMinutes} min.`,
            meta: { exerciseName, reps, durationMinutes },
          })
          toast.xp(`Session saved · +${reps * 2 + 50} XP${questDone ? ' · quest complete!' : ''}`)
        },
        onError: (err) => toast.error(err.message || 'Failed to save session.'),
      },
    )
  }

  const changeExercise = (mode) => {
    setExerciseMode(mode)
    resetCount()
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Solo training" title="Workout Coach" subtitle="AI counts your reps through the camera and rejects sloppy ones. One person in frame." />

      <div className="split">
        <Card flush className="rc-stage">
          <video ref={videoRef} autoPlay muted playsInline className="rc-video" />
          <canvas ref={canvasRef} className="rc-canvas" />

          {!isStreaming && (
            <div className="rc-overlay">
              <span className="icon-tile icon-tile--lg"><Camera size={28} /></span>
              <div className="center">
                <h2 style={{ fontSize: '1.4rem' }}>Ready when you are</h2>
                <p className="muted small" style={{ maxWidth: 340, margin: '6px auto 0' }}>Stand 6–8 feet back with your whole body in frame. Side-on works best for squats and push-ups.</p>
              </div>
              <Button variant="primary" size="lg" icon={Play} loading={isStarting} onClick={startCamera}>
                {isStarting ? 'Starting…' : 'Activate camera'}
              </Button>
              {error && <Alert tone="error">{error}</Alert>}
            </div>
          )}

          {isPoseLoading && (
            <div className="rc-toast"><span className="spinner" /> Loading AI vision engine…</div>
          )}

          {isStreaming && (
            <div className="rc-hud">
              <div className="rc-counter">
                <span className="eyebrow">Reps</span>
                <span className="mono rc-counter__value">
                  {reps}<span className="dim">/{normalizedTargetReps}</span>
                </span>
                {invalidReps > 0 && <span className="tiny red" style={{ fontWeight: 700 }}>{invalidReps} rejected</span>}
              </div>
              <div className="stack-sm" style={{ alignItems: 'flex-end' }}>
                <Badge tone={userVisible ? 'green' : 'red'}>{userVisible ? 'Tracking' : 'Out of view'}</Badge>
                <div className={`rc-advice ${isFormCorrect ? 'rc-advice--ok' : 'rc-advice--bad'}`}>{postureAdvice}</div>
              </div>
            </div>
          )}

          <AnimatePresence>
            {setComplete && (
              <motion.div className="rc-complete" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <Trophy size={36} />
                <div>
                  <div className="eyebrow" style={{ color: 'var(--gold-ink)' }}>Set complete</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem' }}>{normalizedTargetReps} reps cleared!</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <div className="stack">
          <Card>
            <CardHeader title="Session setup" />
            <div className="stack">
              <div className="field">
                <span className="label">Exercise</span>
                <div className="stack-sm" role="radiogroup" aria-label="Exercise">
                  {EXERCISES.map((exercise) => (
                    <button
                      key={exercise.value}
                      type="button"
                      role="radio"
                      aria-checked={exerciseMode === exercise.value}
                      className={`list-row rc-option ${exerciseMode === exercise.value ? 'rc-option--active' : ''}`}
                      onClick={() => changeExercise(exercise.value)}
                    >
                      <span className="grow" style={{ textAlign: 'left' }}>
                        <span style={{ fontWeight: 700, display: 'block' }}>{exercise.label}</span>
                        <span className="tiny muted">{exercise.joints}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="target-reps">Target reps</label>
                <div className="row">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setTargetReps((v) => Math.max(1, (Number(v) || 1) - 1))} aria-label="Fewer reps"><Minus size={16} /></button>
                  <input
                    id="target-reps"
                    className="input mono center"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={targetReps}
                    onChange={(e) => setTargetReps(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setTargetReps((v) => (Number(v) || 0) + 1)} aria-label="More reps"><Plus size={16} /></button>
                </div>
              </div>

              <div className="grid-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                {isStreaming ? (
                  <Button variant="danger" icon={Square} onClick={stopCamera}>End</Button>
                ) : (
                  <Button variant="violet" icon={Play} loading={isStarting} onClick={startCamera}>Start AI</Button>
                )}
                <Button variant="primary" icon={Save} onClick={handleSave} disabled={reps === 0} loading={saveWorkout.isPending}>Save</Button>
              </div>
              <button type="button" className="link small" style={{ color: 'var(--text-muted)', alignSelf: 'center' }} onClick={resetCount}>
                <RotateCcw size={14} /> Reset count
              </button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Live metrics" />
            <div className="grid-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <Stat label="Joint angle" value={`${lastAngle}°`} />
              <Stat label="Session" value={`${Math.floor(sessionSeconds / 60)}:${String(sessionSeconds % 60).padStart(2, '0')}`} />
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="spread tiny" style={{ marginBottom: 6 }}>
                <span className="eyebrow">Target progress</span>
                <span className="mono gold">{Math.round(progressPct)}%</span>
              </div>
              <ProgressBar value={progressPct} tone="gold" label="Target progress" />
            </div>
          </Card>

          <Alert tone="info">
            Video never leaves your device. Only the session summary is saved.
          </Alert>
        </div>
      </div>
    </div>
  )
}
