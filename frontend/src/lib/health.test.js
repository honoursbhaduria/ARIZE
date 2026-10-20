import { describe, expect, it } from 'vitest'
import { bmiScalePct, computeBmi, getBmiCategory, lastSevenDays, normalizeNutritionPayload } from './health'

describe('BMI helpers', () => {
  it('computes BMI with the default 1.70m height', () => {
    expect(computeBmi(70)).toBe(24.2)
  })

  it('returns null without a usable weight', () => {
    expect(computeBmi(null)).toBeNull()
    expect(computeBmi('')).toBeNull()
    expect(computeBmi(0)).toBeNull()
  })

  it('maps BMI values to categories at the boundaries', () => {
    expect(getBmiCategory(18.4).label).toBe('Underweight')
    expect(getBmiCategory(18.5).label).toBe('Normal')
    expect(getBmiCategory(25).label).toBe('Overweight')
    expect(getBmiCategory(30).label).toBe('Obese')
    expect(getBmiCategory(null)).toBeNull()
  })

  it('clamps the scale marker inside the bar', () => {
    expect(bmiScalePct(5)).toBe(2)
    expect(bmiScalePct(60)).toBe(98)
    expect(bmiScalePct(25)).toBe(50)
  })
})

describe('normalizeNutritionPayload', () => {
  it('reads nested recognition payloads and alternate key names', () => {
    expect(normalizeNutritionPayload({ recognition: { detected_food: 'Dal', calories: 210.6, protein_g: 12.2, carbohydrates: 30, fat_g: 4.4 } }))
      .toEqual({ food: 'Dal', calories: 211, protein: 12, carbs: 30, fat: 4 })
  })

  it('returns zeros for empty input', () => {
    expect(normalizeNutritionPayload(null)).toEqual({ food: '', calories: 0, protein: 0, carbs: 0, fat: 0 })
  })
})

describe('lastSevenDays', () => {
  it('buckets items by calendar day, oldest first, today last', () => {
    const now = new Date('2026-10-20T12:00:00Z')
    const days = lastSevenDays(
      [
        { created_at: '2026-10-20T08:00:00Z' },
        { created_at: '2026-10-20T09:00:00Z' },
        { created_at: '2026-10-14T09:00:00Z' },
        { created_at: '2026-10-01T09:00:00Z' },
      ],
      now,
    )
    expect(days).toHaveLength(7)
    expect(days[0].key).toBe('2026-10-14')
    expect(days[0].count).toBe(1)
    expect(days[6]).toMatchObject({ key: '2026-10-20', count: 2, isToday: true })
    expect(days.reduce((sum, d) => sum + d.count, 0)).toBe(3)
  })
})
