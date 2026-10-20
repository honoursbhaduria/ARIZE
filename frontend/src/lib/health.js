export const DEFAULT_HEIGHT_CM = 170

export const BMI_CATEGORIES = [
  { label: 'Underweight', range: '< 18.5', color: '#4cc9f0' },
  { label: 'Normal', range: '18.5–25', color: '#3ddc84' },
  { label: 'Overweight', range: '25–30', color: '#ff9f43' },
  { label: 'Obese', range: '> 30', color: '#ff5c6c' },
]

// Height in centimetres; falls back to 170 cm until the user adds theirs.
export function computeBmi(weightKg, heightCm) {
  const weight = Number(weightKg)
  if (!weight || weight <= 0) return null
  const height = Number(heightCm) > 0 ? Number(heightCm) : DEFAULT_HEIGHT_CM
  const heightM = height / 100
  return Math.round((weight / (heightM * heightM)) * 10) / 10
}

export function getBmiCategory(bmi) {
  if (bmi == null) return null
  if (bmi < 18.5) return BMI_CATEGORIES[0]
  if (bmi < 25) return BMI_CATEGORIES[1]
  if (bmi < 30) return BMI_CATEGORIES[2]
  return BMI_CATEGORIES[3]
}

export const BMI_SCALE_MIN = 10
export const BMI_SCALE_MAX = 40

// Position of a BMI value on the 10–40 scale, clamped so the marker stays visible.
export function bmiScalePct(bmi) {
  return Math.min(Math.max(((bmi - BMI_SCALE_MIN) / (BMI_SCALE_MAX - BMI_SCALE_MIN)) * 100, 2), 98)
}

// Category bands as [start, end] on the scale, for drawing proportional segments.
export const BMI_BANDS = [
  { label: 'Underweight', start: 10, end: 18.5 },
  { label: 'Normal', start: 18.5, end: 25 },
  { label: 'Overweight', start: 25, end: 30 },
  { label: 'Obese', start: 30, end: 40 },
]

export function normalizeNutritionPayload(raw) {
  const source = raw?.recognition || raw?.result || raw || {}
  const per = source.per_100g
  return {
    food: source.food || source.food_name || source.detected_food || '',
    calories: Math.round(Number(source.calories || source.estimated_calories || 0)),
    protein: Math.round(Number(source.protein || source.protein_g || 0)),
    carbs: Math.round(Number(source.carbs || source.carbohydrates || source.carbs_g || 0)),
    fat: Math.round(Number(source.fats || source.fat || source.fat_g || 0)),
    grams: Number(source.grams) || null,
    per100: per
      ? { calories: Number(per.calories) || 0, protein: Number(per.protein) || 0, carbs: Number(per.carbs) || 0, fat: Number(per.fats) || 0 }
      : null,
  }
}

// Totals for `grams` from per-100 g values (one decimal for macros, whole kcal).
export function scalePer100(per100, grams) {
  const factor = (Number(grams) || 0) / 100
  const one = (value) => Math.round(value * factor * 10) / 10
  return { calories: Math.round(per100.calories * factor), protein: one(per100.protein), carbs: one(per100.carbs), fat: one(per100.fat) }
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
