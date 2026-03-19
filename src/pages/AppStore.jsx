import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, Upload, Apple, ShoppingCart, Loader, Camera, X } from 'lucide-react'
import { fetchFoodEstimate, getShoppingSuggestions, recognizeFood } from '../services/api'
import './FeaturePages.css'

export default function AppStore() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [nutritionData, setNutritionData] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [shoppingSuggestions, setShoppingSuggestions] = useState([])
  const [isLoadingShopping, setIsLoadingShopping] = useState(false)

  // Image upload states
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleFoodSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setErrorMessage('')
    setNutritionData(null)

    try {
      const data = await fetchFoodEstimate(searchQuery)
      setNutritionData(data.result)
    } catch (error) {
      setErrorMessage(error.message || 'Failed to fetch nutrition data')
    } finally {
      setIsSearching(false)
    }
  }

  const handleLoadShoppingSuggestions = async (preference) => {
    setIsLoadingShopping(true)
    try {
      const data = await getShoppingSuggestions(preference)
      setShoppingSuggestions(data.suggestions || [])
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load shopping suggestions')
    } finally {
      setIsLoadingShopping(false)
    }
  }

  // Image upload handlers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      setCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      setErrorMessage('Camera not accessible. Please check permissions.')
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop())
    }
    setCameraActive(false)
    setImagePreview(null)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      canvasRef.current.width = videoRef.current.videoWidth
      canvasRef.current.height = videoRef.current.videoHeight
      context.drawImage(videoRef.current, 0, 0)
      const imageData = canvasRef.current.toDataURL('image/jpeg')
      setImagePreview(imageData)
      uploadImage(imageData)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const imageData = event.target?.result
        setImagePreview(imageData)
        uploadImage(imageData)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (imageData) => {
    setIsUploadingImage(true)
    setErrorMessage('')
    try {
      const response = await recognizeFood(imageData)
      if (response.recognition) {
        setNutritionData({
          food: response.recognition.detected_food,
          calories: response.recognition.calories,
          protein: response.recognition.protein,
          carbs: response.recognition.carbs,
          fats: response.recognition.fats,
          source: response.recognition.source || 'image_recognition'
        })
      }
      stopCamera()
    } catch (error) {
      setErrorMessage(error.message || 'Failed to analyze food image')
    } finally {
      setIsUploadingImage(false)
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
        <div className="feature-badge"><Apple size={14} /> Food Recognition + Nutrition AI</div>
        <h1>Nutrition Intelligence</h1>
        <p>Search for any food item to get instant calorie and macro estimates powered by AI.</p>
      </section>

      <section className="feature-grid">
        <article className="feature-card glass">
          <h3><Search size={16} /> Food Search</h3>
          <form className="inline-form" onSubmit={handleFoodSearch}>
            <input
              placeholder="Search food (paneer, oats, chicken breast...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSearching}
            />
            <button className="btn-primary" type="submit" disabled={isSearching}>
              {isSearching ? <Loader size={16} /> : 'Search'}
            </button>
          </form>
          {errorMessage && <p className="camera-error">{errorMessage}</p>}
        </article>

        <article className="feature-card glass">
          <h3>Nutrition Output</h3>
          {nutritionData ? (
            <>
              <p style={{ marginBottom: '12px' }}>
                <strong>{nutritionData.food}</strong> (per 100g)
                <br />
                <small style={{ opacity: 0.7 }}>Source: {nutritionData.source}</small>
              </p>
              <div className="feature-stats">
                <div className="stat-box"><strong>Calories</strong><small>{nutritionData.calories} kcal</small></div>
                <div className="stat-box"><strong>Protein</strong><small>{nutritionData.protein} g</small></div>
                <div className="stat-box"><strong>Carbs</strong><small>{nutritionData.carbs} g</small></div>
                <div className="stat-box"><strong>Fats</strong><small>{nutritionData.fats} g</small></div>
              </div>
            </>
          ) : (
            <>
              <p style={{ marginBottom: '12px', opacity: 0.7 }}>Search for a food item to see nutrition data</p>
              <div className="feature-stats">
                <div className="stat-box"><strong>Calories</strong><small>-- kcal</small></div>
                <div className="stat-box"><strong>Protein</strong><small>-- g</small></div>
                <div className="stat-box"><strong>Carbs</strong><small>-- g</small></div>
                <div className="stat-box"><strong>Fats</strong><small>-- g</small></div>
              </div>
            </>
          )}
        </article>

        <article className="feature-card glass">
          <h3><Upload size={16} /> Upload Food Image</h3>
          <p>Capture photo or upload image to get AI-powered food analysis with calorie estimates.</p>

          {cameraActive && (
            <div style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  className="btn-primary"
                  onClick={capturePhoto}
                  disabled={isUploadingImage}
                  style={{ flex: 1 }}
                >
                  {isUploadingImage ? <Loader size={16} /> : 'Capture Photo'}
                </button>
                <button
                  className="btn-primary btn-secondary"
                  onClick={stopCamera}
                  style={{ flex: 1 }}
                >
                  <X size={16} /> Cancel
                </button>
              </div>
            </div>
          )}

          {imagePreview && !cameraActive && (
            <div style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden' }}>
              <img
                src={imagePreview}
                alt="Preview"
                style={{ width: '100%', height: 'auto', maxHeight: '200px', objectFit: 'cover' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            {!cameraActive && (
              <>
                <button
                  className="btn-primary btn-secondary"
                  onClick={startCamera}
                  disabled={isUploadingImage}
                  style={{ flex: 1 }}
                >
                  <Camera size={16} /> Take Photo
                </button>
                <button
                  className="btn-primary btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  style={{ flex: 1 }}
                >
                  <Upload size={16} /> Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </>
            )}
          </div>
        </article>

        <article className="feature-card glass">
          <h3><ShoppingCart size={16} /> Smart Shopping Integration</h3>
          <p>Get personalized shopping suggestions based on your dietary preferences:</p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              className="btn-primary btn-secondary"
              type="button"
              onClick={() => handleLoadShoppingSuggestions('vegetarian')}
              disabled={isLoadingShopping}
            >
              Vegetarian
            </button>
            <button
              className="btn-primary btn-secondary"
              type="button"
              onClick={() => handleLoadShoppingSuggestions('vegan')}
              disabled={isLoadingShopping}
            >
              Vegan
            </button>
            <button
              className="btn-primary btn-secondary"
              type="button"
              onClick={() => handleLoadShoppingSuggestions('non_veg')}
              disabled={isLoadingShopping}
            >
              Non-Veg
            </button>
          </div>
          {shoppingSuggestions.length > 0 && (
            <ul className="feature-list">
              {shoppingSuggestions.map((item, index) => (
                <li key={index}>
                  <strong>{item.title}</strong> ({item.category})
                  {item.external_url && (
                    <a href={item.external_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px' }}>
                      View
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </motion.div>
  )
}
