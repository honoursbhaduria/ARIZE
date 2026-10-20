import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Camera, Search, ShoppingCart, Utensils } from 'lucide-react'
import { fetchFoodEstimate, fetchFoodEstimateGroq, recognizeFood } from '../services/api'
import { logActivity } from '../services/activityFeed'
import { normalizeNutritionPayload } from '../lib/health'
import ShoppingChat from '../components/ShoppingChat'
import { Alert, Button, Card, CardHeader, Input, PageHeader } from '../ui/components'

const MACROS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: 'var(--orange)' },
  { key: 'protein', label: 'Protein', unit: 'g', color: 'var(--green)' },
  { key: 'carbs', label: 'Carbs', unit: 'g', color: 'var(--blue)' },
  { key: 'fat', label: 'Fat', unit: 'g', color: 'var(--red)' },
]

function MacroGrid({ macros }) {
  return (
    <div className="grid-4">
      {MACROS.map((m) => (
        <div key={m.key} className="list-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
          <span className="stat__label" style={{ color: m.color }}>{m.label}</span>
          <span className="mono" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {macros[m.key]}<span className="tiny dim"> {m.unit}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read image file'))
    reader.readAsDataURL(file)
  })

export default function Nutrition() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const [foodQuery, setFoodQuery] = useState('')
  const [foodLoading, setFoodLoading] = useState(false)
  const [foodResult, setFoodResult] = useState(null)
  const [foodError, setFoodError] = useState('')
  const [imageLoading, setImageLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [imageResult, setImageResult] = useState(null)
  const [imageError, setImageError] = useState('')

  useEffect(() => () => imagePreview && URL.revokeObjectURL(imagePreview), [imagePreview])

  const textMacros = normalizeNutritionPayload(foodResult || {})
  const imageMacros = normalizeNutritionPayload(imageResult || {})
  const imageItems = Array.isArray(imageResult?.recognition?.items) ? imageResult.recognition.items : []

  const handleFoodSearch = async (event) => {
    event.preventDefault()
    const query = foodQuery.trim()
    if (!query) return
    setFoodLoading(true)
    setFoodError('')
    setImageResult(null)
    setImageError('')
    try {
      // Groq gives richer data; fall back to the basic search endpoint.
      const result = await fetchFoodEstimateGroq(query).catch(() => fetchFoodEstimate(query))
      setFoodResult(result)
      const normalized = normalizeNutritionPayload(result)
      if (normalized.calories > 0) {
        queryClient.invalidateQueries({ queryKey: ['nutrition'] })
        logActivity({
          source: 'Nutrition & Shopping',
          action: 'Nutrition search completed',
          details: `${normalized.food || query}: ${normalized.calories} kcal, ${normalized.protein}g protein.`,
          meta: normalized,
        })
      } else {
        setFoodError('No nutrition data found. Try a more specific food, e.g. “2 boiled eggs”.')
      }
    } catch (error) {
      setFoodError(error?.message || 'Unable to calculate nutrition right now. Try another food.')
    } finally {
      setFoodLoading(false)
    }
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImageLoading(true)
    setImageError('')
    setFoodResult(null)
    setFoodError('')
    setImageResult(null)
    setImagePreview(URL.createObjectURL(file))
    try {
      const base64 = await readAsDataUrl(file)
      const visionResult = await recognizeFood(base64).catch((err) => {
        console.error(err)
        return null
      })
      const detectedItems = visionResult?.recognition?.items || visionResult?.items || []
      let normalized = normalizeNutritionPayload(visionResult)

      // Enrich with a text lookup on the detected label.
      if (normalized.food) {
        const enriched = normalizeNutritionPayload(await fetchFoodEstimateGroq(normalized.food).catch(() => null))
        if (enriched.calories > 0) normalized = enriched
      }

      // Last resort: guess from the file name.
      if (normalized.calories <= 0) {
        const fallbackQuery = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim()
        if (fallbackQuery) {
          const fallback = normalizeNutritionPayload(await fetchFoodEstimateGroq(fallbackQuery).catch(() => null))
          if (fallback.calories > 0) normalized = { ...fallback, food: fallback.food || fallbackQuery }
        }
      }

      if (normalized.calories <= 0) throw new Error('Could not estimate calories from this image. Try a clearer food photo.')

      setImageResult({
        recognition: {
          detected_food: normalized.food,
          calories: normalized.calories,
          protein: normalized.protein,
          carbs: normalized.carbs,
          fats: normalized.fat,
          items: detectedItems,
        },
      })
      queryClient.invalidateQueries({ queryKey: ['nutrition'] })
      logActivity({
        source: 'Nutrition & Shopping',
        action: 'Food image analyzed',
        details: `${normalized.food || 'Food item'}: ${normalized.calories} kcal, ${normalized.protein}g protein.`,
        meta: normalized,
      })
    } catch (error) {
      setImageError(error?.message || 'Image analysis failed. Please try a different food photo.')
    } finally {
      setImageLoading(false)
    }
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Fuel" title="Nutrition" subtitle="Find calories and macros for any meal, by text or photo, and shop for healthy products." />

      <div className="split split--even">
        <div className="stack">
          <Card>
            <CardHeader icon={Search} tone="orange" title="Calorie finder" subtitle="Type a meal with its portion" />
            <form className="input-group" onSubmit={handleFoodSearch}>
              <Input value={foodQuery} onChange={(e) => setFoodQuery(e.target.value)} placeholder="e.g. 200g grilled chicken" aria-label="Food to look up" />
              <Button type="submit" variant="primary" icon={Search} loading={foodLoading} aria-label="Search" />
            </form>
            {foodError && <div style={{ marginTop: 12 }}><Alert tone="error">{foodError}</Alert></div>}
            {textMacros.calories > 0 && (
              <div className="stack-sm" style={{ marginTop: 16 }}>
                <strong>{textMacros.food || foodQuery}</strong>
                <MacroGrid macros={textMacros} />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader icon={Camera} tone="green" title="Snap your plate" subtitle="Photo recognition with macro estimates" />
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
            <button type="button" className="dropzone" onClick={() => fileInputRef.current?.click()} disabled={imageLoading}>
              {imagePreview ? <img src={imagePreview} alt="Uploaded food" /> : (
                <>
                  <Camera size={34} strokeWidth={1.5} />
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>Upload or take a food photo</span>
                </>
              )}
              {imageLoading && (
                <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(11,11,20,0.7)' }}>
                  <span className="row" style={{ color: 'var(--text)', fontWeight: 700 }}><span className="spinner" /> Analysing…</span>
                </span>
              )}
            </button>
            {imageError && <div style={{ marginTop: 12 }}><Alert tone="error">{imageError}</Alert></div>}
            {imageMacros.calories > 0 && (
              <div className="stack-sm" style={{ marginTop: 16 }}>
                <strong>{imageMacros.food || 'Food detected'}</strong>
                <MacroGrid macros={imageMacros} />
                {imageItems.length > 0 && (
                  <div className="stack-sm" style={{ marginTop: 8 }}>
                    <span className="eyebrow">Protein per item</span>
                    {imageItems.map((item, index) => (
                      <div key={`${item.name || 'item'}-${index}`} className="list-row small" style={{ padding: '8px 12px' }}>
                        <strong className="grow truncate">{item.name || 'Food item'}</strong>
                        <span className="green mono">{Number(item.protein_per_100g || 0)}g/100g</span>
                        <span className="dim mono">{Number(item.estimated_protein_g || 0)}g est.</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!imagePreview && !imageResult && <p className="tiny dim" style={{ marginTop: 10 }}>Tip: shoot from above in good light for best results.</p>}
          </Card>
        </div>

        <Card className="stack" style={{ minHeight: 560 }}>
          <CardHeader icon={ShoppingCart} tone="violet" title="AI shopping assistant" subtitle="Find health products with buy links" />
          <ShoppingChat />
        </Card>
      </div>

      <Card>
        <div className="row">
          <span className="icon-tile icon-tile--orange"><Utensils size={20} /></span>
          <p className="small muted">Estimates are AI-generated and approximate. Portion size matters, so include weights or counts for best accuracy.</p>
        </div>
      </Card>
    </div>
  )
}
