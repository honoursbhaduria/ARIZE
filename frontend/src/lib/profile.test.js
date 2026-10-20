import { describe, expect, it } from 'vitest'
import { cleanProfilePayload } from './profile'

describe('cleanProfilePayload', () => {
  it('sends null instead of empty strings for numeric fields (API rejects "")', () => {
    expect(cleanProfilePayload({ age: '', weight: '', goal: 'fat_loss' })).toEqual({ age: null, weight: null, goal: 'fat_loss' })
  })

  it('converts numeric strings to numbers', () => {
    expect(cleanProfilePayload({ age: '27', weight: '71.5', height: '178.5' })).toEqual({ age: 27, weight: 71.5, height: 178.5 })
  })

  it('sends null for an empty height', () => {
    expect(cleanProfilePayload({ height: '' })).toEqual({ height: null })
  })

  it('cleans women health fields and drops the key when not provided', () => {
    const cleaned = cleanProfilePayload({
      gender: 'female',
      women_health: { cycle_length_days: '', period_duration_days: '5', last_period_date: '', symptoms: 'cramps' },
    })
    expect(cleaned.women_health).toEqual({ cycle_length_days: null, period_duration_days: 5, last_period_date: null, symptoms: 'cramps' })
    expect('women_health' in cleanProfilePayload({ gender: 'male', women_health: undefined })).toBe(false)
  })
})
