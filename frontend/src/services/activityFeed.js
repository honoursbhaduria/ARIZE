const ACTIVITY_STORAGE_KEY = 'arize_activity_feed_v1'
const ACTIVITY_LIMIT = 120
const ACTIVITY_EVENT = 'arize_activity_feed_updated'

export function getActivityFeed() {
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function logActivity(entry) {
  const activity = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    source: entry?.source || 'General',
    action: entry?.action || 'Updated',
    details: entry?.details || '',
    meta: entry?.meta || {},
  }

  const current = getActivityFeed()
  const next = [activity, ...current].slice(0, ACTIVITY_LIMIT)

  try {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(ACTIVITY_EVENT, { detail: activity }))
  } catch {
    // Ignore storage quota and non-browser issues gracefully.
  }

  return activity
}

export function subscribeToActivityFeed(onUpdate) {
  if (typeof onUpdate !== 'function') return () => {}

  const handler = () => onUpdate(getActivityFeed())
  const storageHandler = (event) => {
    if (event.key === ACTIVITY_STORAGE_KEY) {
      onUpdate(getActivityFeed())
    }
  }

  window.addEventListener(ACTIVITY_EVENT, handler)
  window.addEventListener('storage', storageHandler)

  return () => {
    window.removeEventListener(ACTIVITY_EVENT, handler)
    window.removeEventListener('storage', storageHandler)
  }
}
