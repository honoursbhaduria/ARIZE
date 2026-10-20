import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, ArrowRight, BookOpen, CheckCircle2, CircleDashed, FileVideo, Gauge, PlayCircle, Ruler, Timer, Upload, X } from 'lucide-react'
import { analyzeWorkoutVideo } from '../services/api'
import { exerciseLibraryQuery, workoutSummaryQuery } from '../lib/queries'
import { Alert, Badge, Button, Card, CardHeader, Field, Input, PageHeader, ProgressBar, Skeleton, Stat } from '../ui/components'

const DEFAULT_EXERCISE_IMAGE = 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=400&q=60'

const FALLBACK_EXERCISES = [
  { name: 'Squat', extract: 'Keep back straight, chest up, and knees tracking over toes. Lower until thighs are parallel to the floor.' },
  { name: 'Push-up', extract: 'Maintain a rigid plank line. Elbows at 45° to body. Full range: chest to floor, arms fully extended at top.' },
  { name: 'Bicep Curl', extract: 'Elbow stays stationary at your side. Curl through full range then lower slowly with control.' },
]

const PLACEMENT_TIPS = [
  'Whole body in frame, head to toe.',
  'Side-on view works best for squats and push-ups.',
  'Stand 6–8 feet from the camera.',
  'Good lighting prevents tracking errors.',
]

const STATUS_LABEL = { idle: 'Not tested', checking: 'Testing…', ready: 'Ready', blocked: 'Blocked', unsupported: 'Unsupported' }

export default function ComputerVision() {
  const queryClient = useQueryClient()
  const summary = useQuery(workoutSummaryQuery)
  const library = useQuery(exerciseLibraryQuery)
  const fileInputRef = useRef(null)

  const [videoFile, setVideoFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoDuration, setVideoDuration] = useState(0)
  const [exerciseName, setExerciseName] = useState('Workout Session')
  const [fileError, setFileError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [cameraStatus, setCameraStatus] = useState('idle')
  const [latencyMs, setLatencyMs] = useState(null)

  const analysis = useMutation({
    mutationFn: () => analyzeWorkoutVideo(videoFile, { exercise_name: exerciseName, duration_seconds: videoDuration }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workouts'] }),
  })
  const videoAnalysis = analysis.data?.analysis || null

  useEffect(() => () => videoUrl && URL.revokeObjectURL(videoUrl), [videoUrl])

  const formSignal = videoAnalysis?.form_score != null
    ? Math.round(videoAnalysis.form_score)
    : summary.data?.avg_form_score != null
      ? Math.round(summary.data.avg_form_score)
      : null

  const processFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setFileError('Please upload a valid video file.')
      return
    }
    setVideoFile(file)
    setVideoUrl(URL.createObjectURL(file))
    setVideoDuration(0)
    setFileError('')
    analysis.reset()
  }

  const clearVideo = () => {
    setVideoFile(null)
    setVideoUrl('')
    setFileError('')
    analysis.reset()
  }

  const handleCameraTest = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unsupported')
      return
    }
    setCameraStatus('checking')
    const start = performance.now()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      setLatencyMs(Math.round(performance.now() - start))
      setCameraStatus('ready')
      stream.getTracks().forEach((track) => track.stop())
    } catch {
      setCameraStatus('blocked')
      setLatencyMs(null)
    }
  }

  const exercises = library.data?.length ? library.data : FALLBACK_EXERCISES

  return (
    <div className="page">
      <PageHeader eyebrow="Computer vision" title="Vision Lab" subtitle="Real-time pose tracking, camera diagnostics and deep analysis of your recorded sets." />

      <Card tone="violet">
        <div className="split split--even" style={{ alignItems: 'center' }}>
          <div className="stack-sm">
            <h2 style={{ fontSize: '1.5rem' }}>Ready for live tracking?</h2>
            <p className="muted">Check your camera, then jump into Workout Coach for real-time rep counting and form feedback.</p>
            <div className="row-wrap" style={{ marginTop: 8 }}>
              <Link to="/counter" className="btn btn--primary"><PlayCircle size={18} /> Launch coach</Link>
              <Button variant="ghost" icon={Gauge} loading={cameraStatus === 'checking'} onClick={handleCameraTest}>Run diagnostics</Button>
            </div>
          </div>
          <div className="list">
            <div className="list-row spread">
              <span className="muted">Camera</span>
              <Badge tone={cameraStatus === 'ready' ? 'green' : cameraStatus === 'blocked' || cameraStatus === 'unsupported' ? 'red' : undefined}>
                {cameraStatus === 'ready' ? <CheckCircle2 size={12} /> : <CircleDashed size={12} />} {STATUS_LABEL[cameraStatus]}
              </Badge>
            </div>
            <div className="list-row spread"><span className="muted">Pose model</span><span className="mono">{cameraStatus === 'ready' ? 'Active' : 'Standby'}</span></div>
            <div className="list-row spread"><span className="muted">Latency</span><span className="mono">{latencyMs ? `${latencyMs} ms` : '--'}</span></div>
          </div>
        </div>
        {(cameraStatus === 'blocked' || cameraStatus === 'unsupported') && (
          <div style={{ marginTop: 14 }}>
            <Alert tone="error">{cameraStatus === 'blocked' ? 'Camera permission blocked. Allow camera access in your browser settings.' : 'Camera API is not supported in this browser.'}</Alert>
          </div>
        )}
      </Card>

      <div className="split">
        <div className="stack">
          <Card>
            <CardHeader icon={Upload} title="Deep video analysis" subtitle="Upload a clip of your set for a form score, rep estimate and burn." />
            <div className="stack">
              <Field label="Exercise" htmlFor="exercise-name">
                <Input id="exercise-name" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} placeholder="e.g. Squats" />
              </Field>

              <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={(e) => processFile(e.target.files?.[0])} />
              {videoUrl ? (
                <div style={{ position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <video
                    src={videoUrl}
                    controls
                    playsInline
                    onLoadedMetadata={(e) => setVideoDuration(Math.round(e.currentTarget.duration || 0))}
                    style={{ width: '100%', maxHeight: 320, background: '#000' }}
                  />
                  <button type="button" className="icon-btn" onClick={clearVideo} aria-label="Remove video" style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={`dropzone ${isDragging ? 'dropzone--active' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files?.[0]) }}
                >
                  <FileVideo size={40} strokeWidth={1.5} />
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>Drop a workout clip here</span>
                  <span className="small">or tap to choose from your device</span>
                </button>
              )}
              {videoUrl && (
                <button type="button" className="link small" onClick={() => fileInputRef.current?.click()} style={{ alignSelf: 'flex-start' }}>
                  Change video
                </button>
              )}

              {fileError && <Alert tone="error">{fileError}</Alert>}
              {analysis.isError && <Alert tone="error">{analysis.error?.message || 'Video analysis failed. Please try again.'}</Alert>}

              <Button variant="primary" size="lg" block loading={analysis.isPending} disabled={!videoFile} onClick={() => analysis.mutate()}>
                {analysis.isPending ? 'Analysing…' : 'Analyse recording'}
              </Button>

              {videoAnalysis && (
                <div className="grid-3" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                  <div className="list-row" style={{ justifyContent: 'center' }}><Stat label="Form" value={`${videoAnalysis.form_score}%`} /></div>
                  <div className="list-row" style={{ justifyContent: 'center' }}><Stat label="Reps" value={videoAnalysis.estimated_reps} /></div>
                  <div className="list-row" style={{ justifyContent: 'center' }}><Stat label="Burn" value={`${videoAnalysis.calories_burned}`} hint="kcal" /></div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader icon={Activity} tone="green" title="Live session engine" action={<Badge>MediaPipe Pose</Badge>} />
            <p className="muted" style={{ marginBottom: 14 }}>Tracks 33 body landmarks to calculate joint angles and movement phase in real time.</p>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div className="list-row"><span className="stack-sm" style={{ gap: 2 }}><strong>Skeleton overlay</strong><span className="tiny muted">Real-time 2D joint mapping</span></span></div>
              <div className="list-row"><span className="stack-sm" style={{ gap: 2 }}><strong>Phase detection</strong><span className="tiny muted">Eccentric / concentric tracking</span></span></div>
            </div>
            <div className="eyebrow row" style={{ marginBottom: 8 }}><Ruler size={14} /> Placement guide</div>
            <ul className="stack-sm">
              {PLACEMENT_TIPS.map((tip) => (
                <li key={tip} className="row small"><CheckCircle2 size={16} className="green" style={{ flexShrink: 0 }} /> {tip}</li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="stack">
          <Card>
            <CardHeader icon={Timer} tone="orange" title="Historical form" />
            <div className="row" style={{ alignItems: 'baseline', marginBottom: 10 }}>
              <span className="mono" style={{ fontSize: '2.2rem', fontWeight: 700 }}>{formSignal ?? '--'}%</span>
              <span className="small muted">average accuracy</span>
            </div>
            <ProgressBar value={formSignal || 0} tone="gold" label="Average form" />
          </Card>

          <Card>
            <CardHeader icon={BookOpen} tone="blue" title="Posture reading" subtitle="Guides for every tracked exercise" />
            <div className="list">
              {library.isLoading
                ? [0, 1, 2].map((i) => <Skeleton key={i} height={88} />)
                : exercises.map((ex) => (
                  <div key={ex.name} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                    <div className="row">
                      {library.data?.length ? (
                        <img
                          src={ex.thumbnail || DEFAULT_EXERCISE_IMAGE}
                          alt=""
                          loading="lazy"
                          onError={(e) => { e.currentTarget.src = DEFAULT_EXERCISE_IMAGE }}
                          style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                        />
                      ) : null}
                      <strong className="truncate">{ex.name}</strong>
                    </div>
                    <p className="small muted">{ex.extract ? (ex.extract.length > 160 ? `${ex.extract.slice(0, 160)}…` : ex.extract) : 'Keep form controlled throughout the movement.'}</p>
                    <Link to="/posture-reading" search={{ topic: ex.name }} className="link small">Read more <ArrowRight size={14} /></Link>
                  </div>
                ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Roadmap" />
            <p className="small muted">Coming soon: multi-person tracking, 3D skeletal reconstruction and automatic equipment detection.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
