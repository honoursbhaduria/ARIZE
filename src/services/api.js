const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    const fallback = 'API request failed'
    const payload = await response.json().catch(() => ({ detail: fallback }))
    throw new Error(payload.detail || fallback)
  }

  return response.json()
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

export function fetchAnalytics() {
  return request('/analytics/consistency/')
}

// Nutrition
export function fetchFoodEstimate(foodName) {
  return request('/nutrition/search/', {
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

// Shopping
export function getShoppingSuggestions(preference) {
  return request('/shopping/suggestions/', {
    method: 'POST',
    body: JSON.stringify({ preference }),
  })
}

// Workout Recommendation
export function getWorkoutRecommendation(metrics) {
  return request('/recommendations/workout/', {
    method: 'POST',
    body: JSON.stringify(metrics),
  })
}
