import { useCallback, useEffect, useState } from 'react'

// Today's workout plan ("daily quests") lives in localStorage so Workout Coach
// can tick items off after a synced session.
export const WORKOUT_TASKS_STORAGE_KEY = 'arize_today_workout_tasks_v1'
const TASKS_EVENT = 'arize_tasks_updated'

export const DEFAULT_WORKOUT_TASKS = [
  { id: 'squats', title: 'Squats', details: '3 sets x 12 reps', reps: 36, done: false },
  { id: 'pushups', title: 'Push-ups', details: '3 sets x 12 reps', reps: 36, done: false },
  { id: 'lunges', title: 'Lunges', details: '3 sets x 12 reps per leg', reps: 24, done: false },
  { id: 'plank', title: 'Plank', details: '3 sets x 30 sec hold', reps: 3, done: false },
]

export function loadWorkoutTasks() {
  try {
    const raw = localStorage.getItem(WORKOUT_TASKS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : DEFAULT_WORKOUT_TASKS
  } catch {
    return DEFAULT_WORKOUT_TASKS
  }
}

function saveWorkoutTasks(tasks) {
  try {
    localStorage.setItem(WORKOUT_TASKS_STORAGE_KEY, JSON.stringify(tasks))
  } catch {
    // Storage full or blocked: keep the in-memory state only.
  }
  window.dispatchEvent(new Event(TASKS_EVENT))
}

export function useWorkoutTasks() {
  const [tasks, setTasksState] = useState(loadWorkoutTasks)

  useEffect(() => {
    const reload = () => setTasksState(loadWorkoutTasks())
    window.addEventListener(TASKS_EVENT, reload)
    window.addEventListener('storage', reload)
    return () => {
      window.removeEventListener(TASKS_EVENT, reload)
      window.removeEventListener('storage', reload)
    }
  }, [])

  const setTasks = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(loadWorkoutTasks()) : updater
    saveWorkoutTasks(next)
  }, [])

  return [tasks, setTasks]
}

// Mark matching unfinished tasks done once a saved session covers their reps.
export function completeTasksForSession(exerciseName, repCount) {
  const needle = exerciseName.toLowerCase().replace('-', '')
  let updated = false
  const tasks = loadWorkoutTasks().map((task) => {
    if (!task.done && task.title.toLowerCase().replace('-', '').includes(needle) && repCount >= (task.reps || 1)) {
      updated = true
      return { ...task, done: true }
    }
    return task
  })
  if (updated) saveWorkoutTasks(tasks)
  return updated
}
