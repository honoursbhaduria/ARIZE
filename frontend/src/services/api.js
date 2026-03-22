const DEFAULT_API_BASE_URL = (() => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `${window.location.origin}/api`
    }
    return `http://${host}:8000/api`
  }
  return 'http://localhost:8000/api'
})()

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL

const ACCESS_TOKEN_KEY = 'bt_access_token'
const REFRESH_TOKEN_KEY = 'bt_refresh_token'
const USER_KEY = 'bt_user'

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || ''
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || ''
}

function setAuthSession(payload) {
  const access = payload?.tokens?.access || ''
  const refresh = payload?.tokens?.refresh || ''
  const user = payload?.user || null

  if (access) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access)
  }
  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function isAuthenticated() {
  return !!getAccessToken()
}

async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) {
    return null
  }

  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh }),
  })

  if (!response.ok) {
    clearAuthSession()
    return null
  }

  const payload = await response.json()
  const nextAccess = payload?.access || ''
  if (nextAccess) {
    localStorage.setItem(ACCESS_TOKEN_KEY, nextAccess)
    return nextAccess
  }

  clearAuthSession()
  return null
}

function parseApiError(payload, fallback) {
  if (!payload) {
    return fallback
  }

  if (typeof payload.detail === 'string' && payload.detail.trim()) {
    return payload.detail
  }

  const firstField = Object.keys(payload)[0]
  const firstValue = payload[firstField]
  if (Array.isArray(firstValue) && firstValue.length > 0) {
    return String(firstValue[0])
  }
  if (typeof firstValue === 'string' && firstValue.trim()) {
    return firstValue
  }

  return fallback
}

async function request(path, options = {}, retryOnAuthFailure = true) {
  const isFormData = options.body instanceof FormData
  const skipAuth = options.skipAuth === true
  const mergedOptions = { ...options }
  delete mergedOptions.skipAuth

  const accessToken = getAccessToken()
  const authHeader = !skipAuth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: isFormData
      ? {
          ...authHeader,
          ...(mergedOptions.headers || {}),
        }
      : {
          'Content-Type': 'application/json',
          ...authHeader,
          ...(mergedOptions.headers || {}),
        },
    ...mergedOptions,
  })

  if (response.status === 401 && !skipAuth && retryOnAuthFailure && getRefreshToken()) {
    const nextAccess = await refreshAccessToken()
    if (nextAccess) {
      return request(path, options, false)
    }
  }

  if (!response.ok) {
    const fallback = 'API request failed'
    const payload = await response.json().catch(() => ({ detail: fallback }))
    throw new Error(parseApiError(payload, fallback))
  }

  return response.json()
}

export function loginUser(credentials) {
  return request('/auth/login/', {
    method: 'POST',
    body: JSON.stringify(credentials),
    skipAuth: true,
  }).then((payload) => {
    setAuthSession(payload)
    return payload
  })
}

export function registerUser(payload) {
  return request('/auth/signup/', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  }).then((response) => {
    setAuthSession(response)
    return response
  })
}

export function loginWithGoogle(email) {
  return request('/auth/google/', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuth: true,
  }).then((response) => {
    setAuthSession(response)
    return response
  })
}

// Chat
export function sendChatMessage(message) {
  return request('/chat/ask/', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

// Dashboard
export function fetchDashboard() {
  return request('/dashboard/summary/')
}

export function fetchProfile() {
  return request('/profile/')
}

export function updateProfile(profileData) {
  return request('/profile/', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  })
}

export function fetchAnalytics() {
  return request('/analytics/consistency/')
}

export function fetchAnalyticsOverview() {
  return request('/analytics/overview/')
}

export function fetchStreakLeaderboard(district = '', limit = 10) {
  const params = new URLSearchParams()
  if (district) {
    params.set('district', district)
  }
  params.set('limit', String(limit))
  return request(`/analytics/streak-leaderboard/?${params.toString()}`)
}

// Nutrition
export function fetchFoodEstimate(foodName) {
  return request('/nutrition/search/', {
    method: 'POST',
    body: JSON.stringify({ query: foodName }),
  })
}

export function fetchFoodEstimateGroq(foodName) {
  return request('/nutrition/search/groq/', {
    method: 'POST',
    body: JSON.stringify({ query: foodName }),
  })
}

export function recognizeFood(imageData) {
  return request('/nutrition/recognize/', {
    method: 'POST',
    body: JSON.stringify({ image_data: imageData }),
  })
}

export function fetchNutritionLogs() {
  return request('/nutrition/logs/')
}

// Workout
export function saveWorkoutSession(workoutData) {
  return request('/workouts/sessions/', {
    method: 'POST',
    body: JSON.stringify(workoutData),
  })
}

export function analyzeWorkout(cvData) {
  return request('/workouts/cv/analyze/', {
    method: 'POST',
    body: JSON.stringify(cvData),
  })
}

export function analyzeWorkoutVideo(videoFile, metadata = {}) {
  const formData = new FormData()
  formData.append('video', videoFile)
  formData.append('exercise_name', metadata.exercise_name || 'Workout Session')
  if (metadata.duration_seconds != null) {
    formData.append('duration_seconds', String(metadata.duration_seconds))
  }

  return request('/workouts/video/analyze/', {
    method: 'POST',
    body: formData,
  })
}

export function fetchWorkoutSummary() {
  return request('/workouts/summary/')
}

export function fetchWorkoutSessions() {
  return request('/workouts/sessions/')
}

// Music
export function getMusicRecommendation(mood) {
  return request('/music/recommend/', {
    method: 'POST',
    body: JSON.stringify({ mood }),
  })
}

export function fetchNotificationPreferences() {
  return request('/notifications/preferences/')
}

export function updateNotificationPreferences(preferenceData) {
  return request('/notifications/preferences/', {
    method: 'PUT',
    body: JSON.stringify(preferenceData),
  })
}

export function fetchProgressPhotos() {
  return request('/progress/photos/')
}

export function uploadProgressPhoto(photoData) {
  return request('/progress/photos/', {
    method: 'POST',
    body: JSON.stringify(photoData),
  })
}

// Shopping
export function getShoppingSuggestions(preference) {
  return request('/shopping/suggestions/', {
    method: 'POST',
    body: JSON.stringify({ preference }),
  })
}

export function searchWikipediaProducts(query, limit = 8) {
  return request(`/shopping/wikipedia/search/?query=${encodeURIComponent(query)}&limit=${limit}`)
}

export function shoppingChat(message) {
  return request('/shopping/chat/', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export function addToCart(productData) {
  return request('/shopping/cart/add/', {
    method: 'POST',
    body: JSON.stringify(productData),
  })
}

export function getCartItems() {
  return request('/shopping/cart/')
}

export function removeFromCart(itemId) {
  return request(`/shopping/cart/item/${itemId}/`, {
    method: 'DELETE',
  })
}

export function updateCartItem(itemId, quantity) {
  return request(`/shopping/cart/item/${itemId}/update/`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  })
}

export function clearCart() {
  return request('/shopping/cart/', {
    method: 'DELETE',
  })
}

// Medical Report RAG
export function analyzeMedicalReport(file) {
  const formData = new FormData()
  formData.append('report', file)
  return request('/chat/analyze-report/', {
    method: 'POST',
    body: formData,
  })
}

// Workout Recommendation
export function getWorkoutRecommendation(metrics) {
  return request('/recommendations/workout/', {
    method: 'POST',
    body: JSON.stringify(metrics),
  })
}
