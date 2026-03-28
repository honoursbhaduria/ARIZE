import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Search, ShoppingCart, Utensils, Info } from 'lucide-react'
import { fetchFoodEstimate, fetchFoodEstimateGroq, recognizeFood } from '../services/api'
import ShoppingChat from '../components/ShoppingChat'

function normalizeNutritionPayload(raw) {
   const source = raw?.recognition || raw?.result || raw || {}
   const calories = Math.round(Number(source.calories || source.estimated_calories || 0))
   const protein = Math.round(Number(source.protein || source.protein_g || 0))
   const carbs = Math.round(Number(source.carbs || source.carbohydrates || source.carbs_g || 0))
   const fat = Math.round(Number(source.fats || source.fat || source.fat_g || 0))
   const food = source.food || source.food_name || source.detected_food || ''

   return {
      food,
      calories,
      protein,
      carbs,
      fat,
   }
}

export default function AppStore() {
   const [foodQuery, setFoodQuery] = useState('')
   const [foodLoading, setFoodLoading] = useState(false)
   const [foodResult, setFoodResult] = useState(null)
   const [foodError, setFoodError] = useState('')
   const [imageLoading, setImageLoading] = useState(false)
   const [imagePreview, setImagePreview] = useState('')
   const [imageResult, setImageResult] = useState(null)
   const [imageError, setImageError] = useState('')

   const macros = useMemo(() => {
      return normalizeNutritionPayload(imageResult || foodResult || {})
   }, [foodResult, imageResult])

   const hasResult = macros.calories > 0
   const imageProteinItems = useMemo(() => {
      const items = imageResult?.recognition?.items || imageResult?.items || []
      return Array.isArray(items) ? items : []
   }, [imageResult])

   const handleFoodSearch = async (e) => {
      e.preventDefault()
      if (!foodQuery.trim()) return
      setFoodLoading(true)
      setFoodError('')
      setImageResult(null) // clear image result when searching text
      setImageError('')
      try {
         // Try Groq endpoint first for richer nutrition data
         const result = await fetchFoodEstimateGroq(foodQuery).catch(() => fetchFoodEstimate(foodQuery))
         setFoodResult(result)
      } catch (error) {
         console.error(error)
         setFoodError(error?.message || 'Unable to calculate nutrition right now. Try another food query.')
      } finally {
         setFoodLoading(false)
      }
   }

   const handleImageUpload = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      setImageLoading(true)
      setImageError('')
      setFoodResult(null) // clear text result when uploading image
      setFoodError('')
      setImageResult(null)
      setImagePreview(URL.createObjectURL(file))
      try {
         const reader = new FileReader()
         const base64 = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result)
            reader.onerror = () => reject(new Error('Could not read image file'))
            reader.readAsDataURL(file)
         })
         let visionResult = null
         try {
            visionResult = await recognizeFood(base64)
         } catch (visionError) {
            // Continue with fallback flow even when vision API fails.
            console.error(visionError)
         }
         const detectedItems = visionResult?.recognition?.items || visionResult?.items || []
         let normalized = normalizeNutritionPayload(visionResult)

         // Enrich with Groq text nutrition lookup using detected food label.
         if (normalized.food) {
            const enriched = await fetchFoodEstimateGroq(normalized.food).catch(() => null)
            const enrichedNormalized = normalizeNutritionPayload(enriched)
            if (enrichedNormalized.calories > 0) {
               normalized = enrichedNormalized
            }
         }

         // Last fallback: derive a query from filename if image recognition returns poor data.
         if (normalized.calories <= 0) {
            const fallbackQuery = file.name
               .replace(/\.[^/.]+$/, '')
               .replace(/[_-]+/g, ' ')
               .trim()
            if (fallbackQuery) {
               const fallbackEstimate = await fetchFoodEstimateGroq(fallbackQuery).catch(() => null)
               const fallbackNormalized = normalizeNutritionPayload(fallbackEstimate)
               if (fallbackNormalized.calories > 0) {
                  normalized = {
                     ...fallbackNormalized,
                     food: fallbackNormalized.food || fallbackQuery,
                  }
               }
            }
         }

         if (normalized.calories <= 0) {
            throw new Error('Could not estimate calories from this image. Try a clearer food photo.')
         }

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
      } catch (error) {
         console.error(error)
         setImageError(error?.message || 'Image analysis failed. Please try a different food photo.')
      } finally {
         setImageLoading(false)
      }
   }

   return (
      <motion.div
         className="grid-dashboard"
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
      >
         <div style={{ gridColumn: 'span 12', marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Nutrition & Shopping</h1>
            <p className="text-muted">Track your protein and carbs intake.</p>
         </div>

         {/* Current Selection Analysis */}
         <div className="card" style={{ gridColumn: 'span 12' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                     <Utensils size={20} />
                  </div>
                  <div>
                     <h3 style={{ fontSize: '1rem' }}>Current Selection Analysis</h3>
                     {macros.food && <div className="text-muted" style={{ fontSize: '0.75rem' }}>{macros.food}</div>}
                  </div>
               </div>
               {!hasResult && <p className="text-muted" style={{ fontSize: '0.875rem' }}>Search a food or upload a photo to see nutrition data here.</p>}
               {hasResult && (
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                     {[
                        { label: 'Calories', value: `${macros.calories} kcal`, color: '#fb923c' },
                        { label: 'Protein', value: `${macros.protein}g`, color: '#4ade80' },
                        { label: 'Carbs', value: `${macros.carbs}g`, color: '#60a5fa' },
                        { label: 'Fat', value: `${macros.fat}g`, color: '#f87171' },
                     ].map(m => (
                        <div key={m.label} style={{ textAlign: 'right' }}>
                           <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: m.color }}>{m.label}</div>
                           <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{m.value}</div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>

         {/* Food Recognition */}
         <div style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
               <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>Calories Finder</h3>
               <form onSubmit={handleFoodSearch} style={{ position: 'relative' }}>
                  <input
                     value={foodQuery}
                     onChange={e => setFoodQuery(e.target.value)}
                     placeholder="e.g. 200g Grilled Chicken"
                     style={{ width: '100%', background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '0.75rem 3rem 0.75rem 1rem', color: 'var(--text-primary)', borderRadius: 'var(--radius)' }}
                  />
                  <button type="submit" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                     {foodLoading ? <div className="spinner" /> : <Search size={18} className="text-muted" />}
                  </button>
               </form>
               {foodError && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#f87171' }}>{foodError}</div>
               )}
               {foodResult && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', border: '1px solid var(--accent)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Info size={14} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)' }}>Nutrition Breakdown</span>
                     </div>
                     <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.875rem' }}>{macros.food || foodQuery}</div>
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                        {[
                           { label: 'Calories', value: `${macros.calories}`, unit: 'kcal', color: '#fb923c' },
                           { label: 'Protein', value: `${macros.protein}`, unit: 'g', color: '#4ade80' },
                           { label: 'Carbs', value: `${macros.carbs}`, unit: 'g', color: '#60a5fa' },
                           { label: 'Fat', value: `${macros.fat}`, unit: 'g', color: '#f87171' },
                        ].map(m => (
                           <div key={m.label} style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg)', borderRadius: '8px' }}>
                              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: m.color }}>{m.value}</div>
                              <div style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.6 }}>{m.unit} {m.label}</div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>

            <div className="card">
               <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>Visual Recognition</h3>
               <div
                  style={{
                     border: '1px dashed var(--border)',
                     borderRadius: 'var(--radius)',
                     padding: '2rem',
                     textAlign: 'center',
                     background: 'var(--surface-hover)',
                     cursor: 'pointer',
                     position: 'relative'
                  }}
                  onClick={() => document.getElementById('food-upload').click()}
               >
                  {imagePreview ? (
                     <img src={imagePreview} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: 'var(--radius)' }} />
                  ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <Camera size={32} className="text-muted" strokeWidth={1} />
                        <span style={{ fontSize: '0.875rem' }}>Upload or Snap Food Photo</span>
                     </div>
                  )}
                  <input id="food-upload" type="file" accept="image/*" onChange={handleImageUpload} hidden />
                  {imageLoading && (
                     <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius)' }}>
                        <div className="spinner" />
                     </div>
                  )}
               </div>
               {imageResult && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', border: '1px solid var(--accent)' }}>
                     <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.75rem' }}>🔍 Visual Analysis</div>
                     <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.875rem' }}>{macros.food || 'Food Detected'}</div>
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                        {[
                           { label: 'Calories', value: macros.calories, unit: 'kcal', color: '#fb923c' },
                           { label: 'Protein', value: macros.protein, unit: 'g', color: '#4ade80' },
                           { label: 'Carbs', value: macros.carbs, unit: 'g', color: '#60a5fa' },
                           { label: 'Fat', value: macros.fat, unit: 'g', color: '#f87171' },
                        ].map(m => (
                           <div key={m.label} style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg)', borderRadius: '8px' }}>
                              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: m.color }}>{m.value}</div>
                              <div style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.6 }}>{m.unit} {m.label}</div>
                           </div>
                        ))}
                     </div>
                     {imageProteinItems.length > 0 && (
                        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.9rem' }}>
                           <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.75, marginBottom: '0.6rem' }}>
                              Standard Protein (per item)
                           </div>
                           <div style={{ display: 'grid', gap: '0.5rem' }}>
                              {imageProteinItems.map((item, idx) => (
                                 <div
                                    key={`${item.name || 'item'}-${idx}`}
                                    style={{
                                       display: 'grid',
                                       gridTemplateColumns: '1.6fr 1fr 1fr',
                                       gap: '0.5rem',
                                       fontSize: '0.75rem',
                                       background: 'var(--bg)',
                                       border: '1px solid var(--border)',
                                       borderRadius: '8px',
                                       padding: '0.55rem 0.65rem',
                                    }}
                                 >
                                    <div style={{ fontWeight: 700 }}>{item.name || 'Food item'}</div>
                                    <div style={{ textAlign: 'right', color: '#4ade80' }}>{Number(item.protein_per_100g || 0)}g / 100g</div>
                                    <div style={{ textAlign: 'right', opacity: 0.75 }}>{Number(item.estimated_protein_g || 0)}g est.</div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
               )}
               {imageError && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#f87171' }}>{imageError}</div>
               )}
            </div>
         </div>

         {/* Shopping Assistant */}
         <div style={{ gridColumn: 'span 6' }}>
            <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 1.5rem 0' }}>
                  <ShoppingCart size={18} />
                  <h3 style={{ fontSize: '1.125rem' }}>AI Shopping Assistant</h3>
               </div>
               <div style={{ flex: 1, padding: '1.5rem' }}>
                  <ShoppingChat />
               </div>
            </div>
         </div>
      </motion.div>
   )
}
