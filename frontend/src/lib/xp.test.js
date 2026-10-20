import { describe, expect, it } from 'vitest'
import { computeXp, levelFromXp } from './xp'

describe('computeXp', () => {
  it('weights reps, sessions and streak days', () => {
    expect(computeXp({ totalReps: 10, totalSessions: 2, streakDays: 3 })).toBe(10 * 2 + 2 * 50 + 3 * 25)
  })

  it('treats missing or bad values as zero', () => {
    expect(computeXp()).toBe(0)
    expect(computeXp({ totalReps: undefined, totalSessions: null })).toBe(0)
  })
})

describe('levelFromXp', () => {
  it('starts at level 1 as a Rookie', () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, xpIntoLevel: 0, xpForLevel: 250, progressPct: 0, title: 'Rookie' })
  })

  it('rolls over exactly at the level threshold', () => {
    expect(levelFromXp(249).level).toBe(1)
    expect(levelFromXp(250)).toMatchObject({ level: 2, xpIntoLevel: 0, xpForLevel: 500 })
    // 250 (L1) + 500 (L2) = 750 to reach level 3
    expect(levelFromXp(750).level).toBe(3)
  })

  it('reports progress within the current level', () => {
    expect(levelFromXp(375)).toMatchObject({ level: 2, xpIntoLevel: 125, progressPct: 25 })
  })

  it('caps the title at Legend', () => {
    expect(levelFromXp(10_000_000).title).toBe('Legend')
  })
})
