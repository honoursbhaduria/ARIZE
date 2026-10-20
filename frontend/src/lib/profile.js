export const GOAL_OPTIONS = [
  { value: 'fat_loss', label: 'Fat Loss' },
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'maintenance', label: 'Maintenance' },
]

export const DIET_OPTIONS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'non_veg', label: 'Non-Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
]

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

const toNumberOrNull = (raw) => {
  if (raw === '' || raw == null) return null
  const num = Number(raw)
  return Number.isFinite(num) ? num : null
}

// The API rejects "" for numeric/date fields; send null (or a number) instead.
export function cleanProfilePayload(profile) {
  const payload = { ...profile }
  ;['age', 'weight'].forEach((key) => {
    if (key in payload) payload[key] = toNumberOrNull(payload[key])
  })
  if (payload.women_health) {
    const wh = { ...payload.women_health }
    ;['cycle_length_days', 'period_duration_days'].forEach((key) => {
      if (key in wh) wh[key] = toNumberOrNull(wh[key])
    })
    if (wh.last_period_date === '') wh.last_period_date = null
    payload.women_health = wh
  } else {
    delete payload.women_health
  }
  return payload
}
