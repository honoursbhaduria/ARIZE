import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Camera, ImageUp, Search, ShoppingCart, X } from 'lucide-react'
import { fetchFoodEstimate, fetchFoodEstimateGroq, recognizeFood } from '../services/api'
import { logActivity } from '../services/activityFeed'
import { normalizeNutritionPayload, scalePer100 } from '../lib/health'
import ShoppingChat from '../components/ShoppingChat'
import { Alert, Button, Card, CardHeader, PageHeader } from '../ui/components'
import { Modal } from '../ui/Modal'
import './Nutrition.css'

const MACROS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: 'var(--orange)' },
  { key: 'protein', label: 'Protein', unit: 'g', color: 'var(--green)' },
  { key: 'carbs', label: 'Carbs', unit: 'g', color: 'var(--blue)' },
  { key: 'fat', label: 'Fat', unit: 'g', color: 'var(--red)' },
]

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read image file'))
    reader.readAsDataURL(file)
  })

// Prefer the AI lookup; fall back to the built-in food table.
const lookupFood = (food, grams) => fetchFoodEstimateGroq(food, grams).catch(() => fetchFoodEstimate(food, grams))

export default function Nutrition() {
  const queryClient = useQueryClient()
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const [food, setFood] = useState('')
  const [grams, setGrams] = useState('100')
  const [result, setResult] = useState(null) // normalized payload with per100
  const [items, setItems] = useState([])
  const [preview, setPreview] = useState('')
  const [pending, setPending] = useState('') // 'search' | 'photo'
  const [error, setError] = useState('')
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false)

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const gramsNumber = Math.max(0, Number(grams) || 0)
  // Recalculate instantly when the amount changes; no new request needed.
  const totals = result?.per100 && gramsNumber ? scalePer100(result.per100, gramsNumber) : result

  const record = (normalized, action) => {
    queryClient.invalidateQueries({ queryKey: ['nutrition'] })
    logActivity({
      source: 'Nutrition & Shopping',
      action,
      details: `${normalized.food} (${normalized.grams ?? gramsNumber} g): ${normalized.calories} kcal, ${normalized.protein}g protein.`,
      meta: normalized,
    })
  }

  const search = async (event) => {
    event.preventDefault()
    const query = food.trim()
    if (!query) return
    if (!gramsNumber) {
      setError('Enter how many grams you are eating.')
      return
    }
    setPending('search')
    setError('')
    setItems([])
    try {
      const normalized = normalizeNutritionPayload(await lookupFood(query, gramsNumber))
      if (!normalized.calories && !normalized.per100) throw new Error('No nutrition data found. Try a more common name, e.g. “boiled egg”.')
      setResult(normalized)
      record(normalized, 'Nutrition search completed')
    } catch (err) {
      setResult(null)
      setError(err?.message || 'Unable to calculate nutrition right now.')
    } finally {
      setPending('')
    }
  }

  const analysePhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    setPhotoPickerOpen(false)
    if (!file) return
    setPending('photo')
    setError('')
    setResult(null)
    setItems([])
    setPreview(URL.createObjectURL(file))
    try {
      const vision = await recognizeFood(await readAsDataUrl(file)).catch(() => null)
      const detected = normalizeNutritionPayload(vision)
      setItems(vision?.recognition?.items || vision?.items || [])
      // Last resort: guess the food from the file name.
      const name = detected.food || file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim()
      if (!name) throw new Error('Could not recognise this food. Try a clearer photo, or type the food name.')
      setFood(name)
      const normalized = normalizeNutritionPayload(await lookupFood(name, gramsNumber || 100))
      if (!normalized.calories && !normalized.per100) throw new Error('Could not estimate calories from this photo. Try typing the food name.')
      setResult(normalized)
      record(normalized, 'Food image analyzed')
    } catch (err) {
      setError(err?.message || 'Image analysis failed. Please try a different photo.')
    } finally {
      setPending('')
    }
  }

  const clearPhoto = () => {
    setPreview('')
    setItems([])
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Fuel" title="Nutrition" subtitle="Calories and macros for exactly what you eat, from a name or a photo." />

      <div className="split split--even">
        <Card className="stack">
          <CardHeader icon={Search} tone="orange" title="Calorie finder" subtitle="Values are per 100 g, scaled to your portion" />

          <form className="cf-form" onSubmit={search}>
            <div className="cf-food">
              <input
                className="input"
                value={food}
                onChange={(e) => setFood(e.target.value)}
                placeholder="Food, e.g. chicken breast"
                aria-label="Food to look up"
              />
              <button type="button" className="cf-camera" onClick={() => setPhotoPickerOpen(true)} aria-label="Add a food photo" disabled={Boolean(pending)}>
                <Camera size={19} />
              </button>
            </div>
            <label className="cf-grams">
              <input
                className="input mono"
                type="number"
                inputMode="decimal"
                min={1}
                max={5000}
                step="1"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                aria-label="Amount in grams"
              />
              <span aria-hidden="true">g</span>
            </label>
            <Button type="submit" variant="primary" icon={Search} loading={pending === 'search'} disabled={pending === 'photo'} aria-label="Search" />
          </form>

          {preview && (
            <div className="cf-photo">
              <img src={preview} alt="Your food" />
              <div className="grow small">
                {pending === 'photo' ? (
                  <span className="row" style={{ gap: 8 }}><span className="spinner" /> Recognising your food…</span>
                ) : (
                  <span className="muted">Photo analysed{result?.food ? `: ${result.food}` : ''}</span>
                )}
              </div>
              <button type="button" className="icon-btn" onClick={clearPhoto} aria-label="Remove photo"><X size={16} /></button>
            </div>
          )}

          {error && <Alert tone="error">{error}</Alert>}

          {totals && result && (
            <div className="stack-sm">
              <div className="spread">
                <strong className="truncate">{result.food}</strong>
                <span className="small muted mono">{gramsNumber || result.grams} g</span>
              </div>
              <div className="grid-4">
                {MACROS.map((m) => (
                  <div key={m.key} className="list-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                    <span className="stat__label" style={{ color: m.color }}>{m.label}</span>
                    <span className="mono" style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                      {totals[m.key]}<span className="tiny dim"> {m.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
              {result.per100 && (
                <p className="tiny dim">
                  Per 100 g: {Math.round(result.per100.calories)} kcal · {result.per100.protein} g protein · {result.per100.carbs} g carbs · {result.per100.fat} g fat
                </p>
              )}
              {items.length > 0 && (
                <div className="stack-sm" style={{ marginTop: 6 }}>
                  <span className="eyebrow">Detected in the photo</span>
                  {items.map((item, index) => (
                    <div key={`${item.name || 'item'}-${index}`} className="list-row small" style={{ padding: '8px 12px' }}>
                      <strong className="grow truncate">{item.name || 'Food item'}</strong>
                      <span className="green mono">{Number(item.protein_per_100g || 0)}g protein/100g</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!result && !error && !preview && (
            <p className="tiny dim">Type a food and how much you are eating, or tap the camera to snap your plate.</p>
          )}
        </Card>

        <Card className="stack shop-card">
          <CardHeader icon={ShoppingCart} tone="violet" title="AI shopping assistant" subtitle="Find health products with buy links" />
          <ShoppingChat />
        </Card>
      </div>

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={analysePhoto} />
      <input ref={galleryInputRef} type="file" accept="image/*" hidden onChange={analysePhoto} />

      <Modal open={photoPickerOpen} onClose={() => setPhotoPickerOpen(false)} title="Add a food photo">
        <p className="muted small" style={{ marginBottom: 16 }}>
          Shoot from above in good light. We will recognise the food and use your {gramsNumber || 100} g portion.
        </p>
        <div className="cf-picker">
          <button type="button" className="cf-picker__option" onClick={() => cameraInputRef.current?.click()}>
            <Camera size={26} />
            <strong>Take a photo</strong>
            <span className="tiny muted">Use your camera</span>
          </button>
          <button type="button" className="cf-picker__option" onClick={() => galleryInputRef.current?.click()}>
            <ImageUp size={26} />
            <strong>Upload a photo</strong>
            <span className="tiny muted">Choose from your device</span>
          </button>
        </div>
      </Modal>
    </div>
  )
}
