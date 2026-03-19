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

export function sendChatMessage(message) {
  return request('/chat/ask/', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export function fetchDashboard() {
  return request('/dashboard/summary/')
}

export function fetchAnalytics() {
  return request('/analytics/consistency/')
}

export function fetchFoodEstimate(foodName) {
  return request('/nutrition/search/', {
    method: 'POST',
    body: JSON.stringify({ query: foodName }),
  })
}
