import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, RotateCcw } from 'lucide-react'
import './FeaturePages.css'

const POSE_CONNECTIONS = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 31],
  [28, 32],
]

export default function RepCounter() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const poseLandmarkerRef = useRef(null)
  const animationRef = useRef(null)
  const lastVideoTimeRef = useRef(-1)
  const stageRef = useRef('Stand')
  const isStreamingRef = useRef(false)
  const sessionStartRef = useRef(0)
  const lastRepAtRef = useRef(0)
  const smoothedAngleRef = useRef(180)

  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isPoseLoading, setIsPoseLoading] = useState(false)
  const [isPoseReady, setIsPoseReady] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [reps, setReps] = useState(0)
  const [targetReps, setTargetReps] = useState(20)
  const [exerciseMode, setExerciseMode] = useState('squat')
  const [movementStage, setMovementStage] = useState('Stand')
  const [lastAngle, setLastAngle] = useState(180)
  const [symmetryScore, setSymmetryScore] = useState(100)
  const [sessionSeconds, setSessionSeconds] = useState(0)

  const cameraSupported = useMemo(() => Boolean(navigator.mediaDevices?.getUserMedia), [])

  const calculateAngle = (pointA, pointB, pointC) => {
    const radians =
      Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
      Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x)
    let degrees = Math.abs((radians * 180) / Math.PI)
    if (degrees > 180) degrees = 360 - degrees
    return degrees
  }

  const drawPoseOverlay = useCallback((result) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const width = video.videoWidth || video.clientWidth
    const height = video.videoHeight || video.clientHeight
    if (!width || !height) return

    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, width, height)

    const landmarks = result?.landmarks?.[0]
    if (!landmarks) return

    context.lineWidth = 3
    context.strokeStyle = '#22d3ee'

    POSE_CONNECTIONS.forEach(([startIndex, endIndex]) => {
      const start = landmarks[startIndex]
      const end = landmarks[endIndex]
      if (!start || !end) return
      if ((start.visibility ?? 1) < 0.4 || (end.visibility ?? 1) < 0.4) return

      context.beginPath()
      context.moveTo(start.x * width, start.y * height)
      context.lineTo(end.x * width, end.y * height)
      context.stroke()
    })

    context.fillStyle = '#2563eb'
    landmarks.forEach((point) => {
      if (!point || (point.visibility ?? 1) < 0.45) return
      context.beginPath()
      context.arc(point.x * width, point.y * height, 4, 0, Math.PI * 2)
      context.fill()
    })
  }, [])

  const getExerciseConfig = useCallback((mode) => {
    const map = {
      squat: {
        label: 'Squat',
        downThreshold: 130,
        upThreshold: 155,
        minRepInterval: 550,
        stageLabels: { down: 'Down', up: 'Stand' },
      },
      pushup: {
        label: 'Push-up',
        downThreshold: 95,
        upThreshold: 155,
        minRepInterval: 450,
        stageLabels: { down: 'Down', up: 'Up' },
      },
      bicep_curl: {
        label: 'Bicep Curl',
        downThreshold: 145,
        upThreshold: 65,
        minRepInterval: 350,
        stageLabels: { down: 'Extended', up: 'Contracted' },
      },
      shoulder_press: {
        label: 'Shoulder Press',
        downThreshold: 95,
        upThreshold: 155,
        minRepInterval: 400,
        stageLabels: { down: 'Lowered', up: 'Pressed' },
      },
      lunge: {
        label: 'Lunge',
        downThreshold: 118,
        upThreshold: 155,
        minRepInterval: 550,
        stageLabels: { down: 'Down', up: 'Stand' },
      },
    }
    return map[mode] || map.squat
  }, [])

  const getModeAngles = useCallback((landmarks, mode) => {
    const leftShoulder = landmarks[11]
    const rightShoulder = landmarks[12]
    const leftElbow = landmarks[13]
    const rightElbow = landmarks[14]
    const leftWrist = landmarks[15]
    const rightWrist = landmarks[16]
    const leftHip = landmarks[23]
    const rightHip = landmarks[24]
    const leftKnee = landmarks[25]
    const rightKnee = landmarks[26]
    const leftAnkle = landmarks[27]
    const rightAnkle = landmarks[28]

    const leftKneeAngle = leftHip && leftKnee && leftAnkle ? calculateAngle(leftHip, leftKnee, leftAnkle) : null
    const rightKneeAngle = rightHip && rightKnee && rightAnkle ? calculateAngle(rightHip, rightKnee, rightAnkle) : null
    const leftElbowAngle = leftShoulder && leftElbow && leftWrist ? calculateAngle(leftShoulder, leftElbow, leftWrist) : null
    const rightElbowAngle = rightShoulder && rightElbow && rightWrist ? calculateAngle(rightShoulder, rightElbow, rightWrist) : null

    if (mode === 'pushup' || mode === 'bicep_curl' || mode === 'shoulder_press') {
      if (!leftElbowAngle || !rightElbowAngle) return null
      return {
        leftAngle: leftElbowAngle,
        rightAngle: rightElbowAngle,
        activeAngle: (leftElbowAngle + rightElbowAngle) / 2,
      }
    }

    if (mode === 'lunge') {
      if (!leftKneeAngle || !rightKneeAngle) return null
      const active = Math.min(leftKneeAngle, rightKneeAngle)
      return {
        leftAngle: leftKneeAngle,
        rightAngle: rightKneeAngle,
        activeAngle: active,
      }
    }

    if (!leftKneeAngle || !rightKneeAngle) return null
    return {
      leftAngle: leftKneeAngle,
      rightAngle: rightKneeAngle,
      activeAngle: (leftKneeAngle + rightKneeAngle) / 2,
    }
  }, [])

  const processPose = useCallback((result) => {
      if (!result?.landmarks?.length) return
      const landmarks = result.landmarks[0]

      const config = getExerciseConfig(exerciseMode)
      const modeAngles = getModeAngles(landmarks, exerciseMode)
      if (!modeAngles) return

      smoothedAngleRef.current = smoothedAngleRef.current * 0.7 + modeAngles.activeAngle * 0.3
      const stableAngle = smoothedAngleRef.current
      setLastAngle(Math.round(stableAngle))
      const angleGap = Math.abs(modeAngles.leftAngle - modeAngles.rightAngle)
      const score = Math.max(0, Math.min(100, 100 - angleGap * 2.5))
      setSymmetryScore(Math.round(score))

      if (exerciseMode === 'bicep_curl') {
        if (stableAngle > config.downThreshold) {
          stageRef.current = config.stageLabels.down
          setMovementStage(config.stageLabels.down)
        }

        if (stableAngle < config.upThreshold && stageRef.current === config.stageLabels.down) {
          const now = Date.now()
          if (now - lastRepAtRef.current < config.minRepInterval) return
          lastRepAtRef.current = now
          stageRef.current = config.stageLabels.up
          setMovementStage(config.stageLabels.up)
          setReps((value) => value + 1)
        }
      } else {
        if (stableAngle < config.downThreshold) {
          stageRef.current = config.stageLabels.down
          setMovementStage(config.stageLabels.down)
        }

        if (stableAngle > config.upThreshold && stageRef.current === config.stageLabels.down) {
          const now = Date.now()
          if (now - lastRepAtRef.current < config.minRepInterval) return
          lastRepAtRef.current = now
          stageRef.current = config.stageLabels.up
          setMovementStage(config.stageLabels.up)
          setReps((value) => value + 1)
        }
      }
    }, [exerciseMode, getExerciseConfig, getModeAngles])

  const runDetection = useCallback(() => {
    const video = videoRef.current
    const poseLandmarker = poseLandmarkerRef.current

    if (!video || !poseLandmarker || !isStreamingRef.current) return

    if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime
      const result = poseLandmarker.detectForVideo(video, performance.now())
      drawPoseOverlay(result)
      processPose(result)
    }

    animationRef.current = requestAnimationFrame(runDetection)
  }, [drawPoseOverlay, processPose])

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    if (canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      context?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }

    setIsStreaming(false)
    isStreamingRef.current = false
    sessionStartRef.current = 0
    lastRepAtRef.current = 0
    smoothedAngleRef.current = 180
    setSessionSeconds(0)
    stageRef.current = 'Stand'
    setMovementStage('Stand')
    setLastAngle(180)
    setSymmetryScore(100)
  }, [])

  const loadDevices = useCallback(async () => {
    if (!cameraSupported) return
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      const cams = all.filter((d) => d.kind === 'videoinput')
      setDevices(cams)
      if (!selectedDeviceId && cams[0]) {
        setSelectedDeviceId(cams[0].deviceId)
      }
    } catch {
      setDevices([])
    }
  }, [cameraSupported, selectedDeviceId])

  const loadPoseLandmarker = useCallback(async () => {
    if (poseLandmarkerRef.current) {
      setIsPoseReady(true)
      return
    }

    setIsPoseLoading(true)
    try {
      const vision = await import('@mediapipe/tasks-vision')
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
      )

      try {
        poseLandmarkerRef.current = await vision.PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        })
      } catch {
        poseLandmarkerRef.current = await vision.PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        })
      }

      setIsPoseReady(true)
    } catch {
      setIsPoseReady(false)
      setErrorMessage('Pose engine failed to load. Check internet and reload page.')
    } finally {
      setIsPoseLoading(false)
    }
  }, [])

  const requestCameraStream = useCallback(async (deviceId) => {
    const tryConstraints = []

    if (deviceId) {
      tryConstraints.push({
        video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      tryConstraints.push({
        video: { deviceId: { ideal: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
    }

    tryConstraints.push(
      { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: true, audio: false },
    )

    let lastError = null
    for (const constraints of tryConstraints) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        return mediaStream
      } catch (error) {
        lastError = error
      }
    }

    throw lastError || new Error('Unable to open camera stream')
  }, [])

  const startCamera = useCallback(
    async (deviceId = selectedDeviceId) => {
      if (!cameraSupported) {
        setErrorMessage('Camera not supported in this browser.')
        return
      }

      setErrorMessage('')
      setIsStarting(true)

      try {
        stopCamera()

        const mediaStream = await requestCameraStream(deviceId)
        streamRef.current = mediaStream
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          await videoRef.current.play()
        }

        setIsStreaming(true)
        isStreamingRef.current = true
        sessionStartRef.current = Date.now()
        await loadDevices()

        if (!poseLandmarkerRef.current) {
          loadPoseLandmarker()
        }
      } catch (error) {
        if (error?.name === 'NotAllowedError') {
          setErrorMessage('Permission denied. Please allow camera access.')
        } else if (error?.name === 'NotReadableError') {
          setErrorMessage('Camera is busy in another app. Close other camera apps and retry.')
        } else if (error?.name === 'NotFoundError') {
          setErrorMessage('No camera found on this device.')
        } else {
          setErrorMessage('Failed to open camera. Retry and ensure browser has camera permission.')
        }
        setIsStreaming(false)
      } finally {
        setIsStarting(false)
      }
    },
    [cameraSupported, loadDevices, loadPoseLandmarker, requestCameraStream, selectedDeviceId, stopCamera],
  )

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  useEffect(() => {
    loadPoseLandmarker()
  }, [loadPoseLandmarker])

  useEffect(() => {
    if (isStreaming && poseLandmarkerRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      runDetection()
    }
  }, [isStreaming, isPoseReady, runDetection])

  useEffect(() => {
    return () => {
      stopCamera()
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close()
        poseLandmarkerRef.current = null
      }
    }
  }, [stopCamera])

  useEffect(() => {
    if (!isStreaming) return undefined
    const timer = window.setInterval(() => {
      if (sessionStartRef.current) {
        setSessionSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000))
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isStreaming])

  const progress = Math.min(100, Math.round((reps / Math.max(1, targetReps)) * 100))

  useEffect(() => {
    stageRef.current = getExerciseConfig(exerciseMode).stageLabels.up
    setMovementStage(getExerciseConfig(exerciseMode).stageLabels.up)
    setReps(0)
    lastRepAtRef.current = 0
    smoothedAngleRef.current = 180
    setLastAngle(180)
  }, [exerciseMode, getExerciseConfig])

  return (
    <motion.div
      className="page-container feature-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <section className="feature-hero glass">
        <div className="feature-badge"><Camera size={14} /> See Me Counting</div>
        <h1>Live Rep Counting Page</h1>
        <p>Open camera and perform squats. Reps count automatically when you move from Down to Stand.</p>
      </section>

      <section className="feature-grid">
        <article className="feature-card glass" style={{ gridColumn: '1 / -1' }}>
          <div className="camera-preview-wrap counter-preview-wrap">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`camera-preview ${isStreaming ? '' : 'camera-preview-hidden'}`}
            />
            <canvas
              ref={canvasRef}
              className={`pose-overlay ${isStreaming ? '' : 'camera-preview-hidden'}`}
            />

            {!isStreaming && (
              <div className="camera-empty-state">
                <Camera size={28} />
                <p>Start camera to see yourself counting</p>
              </div>
            )}

            <div className="counter-overlay glass">
              <span>REPS</span>
              <strong>{reps}</strong>
              <small>Target: {targetReps}</small>
            </div>
          </div>

          <div className="inline-form" style={{ marginBottom: 10 }}>
            <label htmlFor="exerciseMode">Exercise mode</label>
            <select
              id="exerciseMode"
              value={exerciseMode}
              onChange={(e) => setExerciseMode(e.target.value)}
            >
              <option value="squat">Squat</option>
              <option value="pushup">Push-up</option>
              <option value="bicep_curl">Bicep Curl</option>
              <option value="shoulder_press">Shoulder Press</option>
              <option value="lunge">Lunge</option>
            </select>
          </div>

          <div className="inline-form" style={{ marginBottom: 10 }}>
            <label htmlFor="targetReps">Target reps</label>
            <input
              id="targetReps"
              type="number"
              min="1"
              value={targetReps}
              onChange={(e) => setTargetReps(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

          {devices.length > 1 && (
            <div className="inline-form" style={{ marginBottom: 10 }}>
              <label htmlFor="cameraSelect">Camera device</label>
              <select
                id="cameraSelect"
                value={selectedDeviceId}
                onChange={(e) => {
                  const next = e.target.value
                  setSelectedDeviceId(next)
                  if (isStreaming) {
                    startCamera(next)
                  }
                }}
              >
                {devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="counter-meta">
            <span>Exercise: <strong>{getExerciseConfig(exerciseMode).label}</strong></span>
            <span>Stage: <strong>{movementStage}</strong></span>
            <span>Joint angle: <strong>{lastAngle}°</strong></span>
            <span>Symmetry: <strong>{symmetryScore}%</strong></span>
            <span>Session: <strong>{sessionSeconds}s</strong></span>
            <span>Pose engine: <strong>{isPoseReady ? 'Ready' : isPoseLoading ? 'Loading' : 'Unavailable'}</strong></span>
          </div>

          <div className="camera-actions">
            <button className="btn-primary" type="button" onClick={() => startCamera()} disabled={isStarting}>
              {isStarting ? 'Starting...' : 'Start Camera'}
            </button>
            <button className="btn-primary btn-secondary" type="button" onClick={stopCamera}>Stop Camera</button>
            <button className="btn-primary btn-secondary" type="button" onClick={() => setReps((value) => value + 1)}>
              +1 Rep (Fallback)
            </button>
            <button className="btn-primary btn-secondary" type="button" onClick={() => setReps(0)}>
              <RotateCcw size={16} /> Reset
            </button>
          </div>

          <p className="camera-hint">Tip: camera should appear immediately; pose counting may take a few seconds to become Ready. Keep full body visible from side angle.</p>
          {errorMessage && <p className="camera-error">{errorMessage}</p>}
          {!cameraSupported && <p className="camera-error">Camera API is not available in this browser.</p>}
        </article>
      </section>
    </motion.div>
  )
}
