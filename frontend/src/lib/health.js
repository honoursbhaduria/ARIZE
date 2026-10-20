export const DEFAULT_HEIGHT_M = 1.7

export const BMI_CATEGORIES = [
  { label: 'Underweight', range: '< 18.5', color: '#4cc9f0' },
  { label: 'Normal', range: '18.5–25', color: '#3ddc84' },
  { label: 'Overweight', range: '25–30', color: '#ff9f43' },
  { label: 'Obese', range: '> 30', color: '#ff5c6c' },
]

export function computeBmi(weightKg, heightM = DEFAULT_HEIGHT_M) {
  const weight = Number(weightKg)
  if (!weight || weight <= 0) return null
  return Math.round((weight / (heightM * heightM)) * 10) / 10
}

export function getBmiCategory(bmi) {
  if (bmi == null) return null
  if (bmi < 18.5) return BMI_CATEGORIES[0]
  if (bmi < 25) return BMI_CATEGORIES[1]
  if (bmi < 30) return BMI_CATEGORIES[2]
  return BMI_CATEGORIES[3]
}

// Position of a BMI value on a 10–40 scale, clamped for the marker.
export function bmiScalePct(bmi) {
  return Math.min(Math.max(((bmi - 10) / 30) * 100, 2), 98)
}

export function normalizeNutritionPayload(raw) {
  const source = raw?.recognition || raw?.result || raw || {}
  return {
    food: source.food || source.food_name || source.detected_food || '',
    calories: Math.round(Number(source.calories || source.estimated_calories || 0)),
    protein: Math.round(Number(source.protein || source.protein_g || 0)),
    carbs: Math.round(Number(source.carbs || source.carbohydrates || source.carbs_g || 0)),
    fat: Math.round(Number(source.fats || source.fat || source.fat_g || 0)),
  }
}

const dayKey = (date) => date.toISOString().slice(0, 10)

// Last 7 calendar days (oldest first) with counts from created_at timestamps.
export function lastSevenDays(items = [], now = new Date()) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = dayKey(d)
    const matches = items.filter((item) => (item?.created_at || '').slice(0, 10) === key)
    days.push({
      key,
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      count: matches.length,
      items: matches,
      isToday: i === 0,
    })
  }
  return days
}

export function todayKey(now = new Date()) {
  return dayKey(now)
}
