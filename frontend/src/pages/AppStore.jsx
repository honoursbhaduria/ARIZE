import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Search, ShoppingCart, Utensils, Apple, Info, Trash2, Plus } from 'lucide-react'
import { fetchFoodEstimate, recognizeFood } from '../services/api'
import ShoppingChat from '../components/ShoppingChat'

export default function AppStore() {
  const [foodQuery, setFoodQuery] = useState('')
  const [foodLoading, setFoodLoading] = useState(false)
  const [foodResult, setFoodResult] = useState(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [imageResult, setImageResult] = useState(null)

  const macros = useMemo(() => {
    const source = imageResult || foodResult || {}
    return {
      calories: Math.round(Number(source.calories || source.estimated_calories || 0)),
      protein: Math.round(Number(source.protein || source.protein_g || 0)),
      carbs: Math.round(Number(source.carbs || source.carbohydrates || source.carbs_g || 0)),
      fat: Math.round(Number(source.fat || source.fat_g || 0)),
    }
  }, [foodResult, imageResult])

  const handleFoodSearch = async (e) => {
    e.preventDefault()
    if (!foodQuery.trim()) return
    setFoodLoading(true)
    try {
      const result = await fetchFoodEstimate(foodQuery)
      setFoodResult(result)
    } catch (error) {
      console.error(error)
    } finally {
      setFoodLoading(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageLoading(true)
    setImagePreview(URL.createObjectURL(file))
    try {
      const reader = new FileReader()
      const base64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(file)
      })
      const result = await recognizeFood(base64)
      setImageResult(result)
    } catch (error) {
      console.error(error)
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
        <p className="text-muted">AI-powered food analysis and healthy shopping assistant.</p>
      </div>

      {/* Macro Summary */}
      <div className="card" style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
               <Utensils size={20} />
            </div>
            <h3 style={{ fontSize: '1rem' }}>Current Selection Analysis</h3>
         </div>
         <div style={{ display: 'flex', gap: '3rem' }}>
            <div style={{ textAlign: 'right' }}>
               <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Calories</div>
               <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{macros.calories}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
               <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Protein</div>
               <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{macros.protein}g</div>
            </div>
            <div style={{ textAlign: 'right' }}>
               <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Carbs</div>
               <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{macros.carbs}g</div>
            </div>
            <div style={{ textAlign: 'right' }}>
               <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Fat</div>
               <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{macros.fat}g</div>
            </div>
         </div>
      </div>

      {/* Food Recognition */}
      <div style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
         <div className="card">
            <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>Text Analysis</h3>
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
            {foodResult && (
               <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                     <Info size={14} className="text-muted" />
                     <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Analysis Result</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                     {foodResult.food_name || foodQuery}: {foodResult.calories || foodResult.estimated_calories} kcal
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
               <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Detected Items:</div>
                  <div style={{ fontSize: '0.875rem' }}>{imageResult.item || 'Multiple items detected'}</div>
               </div>
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
