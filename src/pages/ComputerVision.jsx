import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Camera, Activity, Timer, AlertTriangle } from 'lucide-react'
import './FeaturePages.css'

export default function ComputerVision() {
  const videoRef = useRef(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [currentStream, setCurrentStream] = useState(null)
  const [repCount, setRepCount] = useState(0)
  const detectedExercise = 'Squats'

  const cameraSupported = useMemo(
    () => Boolean(navigator.mediaDevices?.getUserMedia),
    [],
  )

  const stopStream = () => {
    if (currentStream) {
      currentStream.getTracks().forEach((track) => track.stop())
      setCurrentStream(null)
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsStreaming(false)
  }

  const loadCameras = useCallback(async () => {
    if (!cameraSupported) return
    try {
      const mediaDevices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = mediaDevices.filter((device) => device.kind === 'videoinput')
      setDevices(videoDevices)
      if (!selectedDeviceId && videoDevices[0]) {
        setSelectedDeviceId(videoDevices[0].deviceId)
      }
    } catch {
      setDevices([])
    }
  }, [cameraSupported, selectedDeviceId])

  const startCamera = async (deviceId = selectedDeviceId) => {
    if (!cameraSupported) {
      setErrorMessage('Camera is not supported on this browser.')
      return
    }

    setIsStarting(true)
    setErrorMessage('')

    try {
      stopStream()

      const constraints = {
        video: deviceId
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setCurrentStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsStreaming(true)
      await loadCameras()
    } catch (error) {
      const name = error?.name || ''
      if (name === 'NotAllowedError') {
        setErrorMessage('Camera permission denied. Please allow camera access and retry.')
      } else if (name === 'NotFoundError') {
        setErrorMessage('No camera device found. Connect a webcam and retry.')
      } else {
        setErrorMessage('Unable to start camera. Try refreshing the page and retry.')
      }
      setIsStreaming(false)
    } finally {
      setIsStarting(false)
    }
  }

  useEffect(() => {
    loadCameras()
  }, [loadCameras])

  useEffect(() => {
    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [currentStream])

  const handleSwitchCamera = async (event) => {
    const deviceId = event.target.value
    setSelectedDeviceId(deviceId)
    if (isStreaming) {
      await startCamera(deviceId)
    }
  }

  return (
    <motion.div
      className="page-container feature-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <section className="feature-hero glass">
        <div className="feature-badge"><Camera size={14} /> OpenCV + MediaPipe</div>
        <h1>AI Workout Tracking (CV Based)</h1>
        <p>Real-time rep counting, exercise detection, form checks, and session summaries.</p>
      </section>

      <section className="feature-grid">
        <article className="feature-card glass">
          <h3><Activity size={16} /> Live Camera Session</h3>
          <div className="camera-preview-wrap">
            {isStreaming ? (
              <video ref={videoRef} autoPlay muted playsInline className="camera-preview" />
            ) : (
              <div className="camera-empty-state">
                <Camera size={26} />
                <p>Camera inactive</p>
              </div>
            )}
          </div>

          {devices.length > 1 && (
            <div className="inline-form">
              <select value={selectedDeviceId} onChange={handleSwitchCamera}>
                {devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <ul className="feature-list">
            <li>Detected exercise: {detectedExercise}</li>
            <li>Rep count: {repCount}</li>
            <li>Camera status: {isStreaming ? 'Live' : 'Stopped'}</li>
          </ul>

          <div className="camera-actions">
            <button
              className="btn-primary"
              type="button"
              onClick={() => startCamera()}
              disabled={isStarting}
            >
              {isStarting ? 'Starting...' : 'Start Camera'}
            </button>
            <button className="btn-primary btn-secondary" type="button" onClick={stopStream}>
              Stop Camera
            </button>
            <button className="btn-primary btn-secondary" type="button" onClick={() => setRepCount((count) => count + 1)}>
              +1 Rep
            </button>
            <Link className="btn-primary" to="/counter">Open Live Rep Counter</Link>
          </div>

          {errorMessage && <p className="camera-error">{errorMessage}</p>}
          {!cameraSupported && <p className="camera-error">Your browser does not support camera capture APIs.</p>}
        </article>

        <article className="feature-card glass">
          <h3><Timer size={16} /> Exercise Detection</h3>
          <p>Supported: pushups, squats, lunges, planks, jumping jacks, and sit-ups.</p>
          <div className="tag-row">
            <span className="tag">Pushups</span>
            <span className="tag">Squats</span>
            <span className="tag">Lunges</span>
            <span className="tag">Sit-ups</span>
          </div>
        </article>

        <article className="feature-card glass">
          <h3><AlertTriangle size={16} /> Form Tracking</h3>
          <ul className="feature-list">
            <li>Back angle unstable in final reps</li>
            <li>Knee alignment improved by 12%</li>
            <li>Depth consistency: Medium</li>
          </ul>
          <button className="btn-primary" type="button">View Corrections</button>
        </article>

        <article className="feature-card glass">
          <h3>Workout Session Summary</h3>
          <div className="feature-stats">
            <div className="stat-box"><strong>43</strong><small>Total reps</small></div>
            <div className="stat-box"><strong>27m</strong><small>Active time</small></div>
            <div className="stat-box"><strong>84%</strong><small>Form score</small></div>
          </div>
        </article>
      </section>
    </motion.div>
  )
}
