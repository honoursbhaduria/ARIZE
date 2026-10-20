import { describe, expect, it } from 'vitest'
import { DEFAULT_WORKOUT_TASKS, WORKOUT_TASKS_STORAGE_KEY, completeTasksForSession, loadWorkoutTasks } from './workoutTasks'

describe('workout tasks', () => {
  it('falls back to defaults when storage is empty or corrupt', () => {
    expect(loadWorkoutTasks()).toEqual(DEFAULT_WORKOUT_TASKS)
    localStorage.setItem(WORKOUT_TASKS_STORAGE_KEY, '{not json')
    expect(loadWorkoutTasks()).toEqual(DEFAULT_WORKOUT_TASKS)
  })

  it('completes the "Push-ups" quest from a "Push-up" session (hyphen regression)', () => {
    localStorage.setItem(WORKOUT_TASKS_STORAGE_KEY, JSON.stringify(DEFAULT_WORKOUT_TASKS))
    expect(completeTasksForSession('Push-up', 36)).toBe(true)
    const pushups = loadWorkoutTasks().find((t) => t.id === 'pushups')
    expect(pushups.done).toBe(true)
  })

  it('does not complete a quest when reps fall short', () => {
    localStorage.setItem(WORKOUT_TASKS_STORAGE_KEY, JSON.stringify(DEFAULT_WORKOUT_TASKS))
    expect(completeTasksForSession('Squat', 10)).toBe(false)
    expect(loadWorkoutTasks().find((t) => t.id === 'squats').done).toBe(false)
  })

  it('notifies listeners when tasks change', () => {
    localStorage.setItem(WORKOUT_TASKS_STORAGE_KEY, JSON.stringify(DEFAULT_WORKOUT_TASKS))
    let fired = 0
    const listener = () => { fired += 1 }
    window.addEventListener('arize_tasks_updated', listener)
    completeTasksForSession('Squat', 36)
    window.removeEventListener('arize_tasks_updated', listener)
    expect(fired).toBe(1)
  })
})
