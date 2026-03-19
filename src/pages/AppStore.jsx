import { motion } from 'framer-motion'
import { Search, Upload, Apple, ShoppingCart } from 'lucide-react'
import './FeaturePages.css'

export default function AppStore() {
  return (
    <motion.div
      className="page-container feature-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <section className="feature-hero glass">
        <div className="feature-badge"><Apple size={14} /> Food Recognition + Nutrition AI</div>
        <h1>Nutrition Intelligence</h1>
        <p>Upload food image, detect food with model/API, estimate calories/macros, and use manual search fallback.</p>
      </section>

      <section className="feature-grid">
        <article className="feature-card glass">
          <h3><Upload size={16} /> Upload Food Image</h3>
          <p>Image inference pipeline detects likely food item and serving size estimate.</p>
          <button className="btn-primary" type="button">Choose Image</button>
        </article>

        <article className="feature-card glass">
          <h3>Nutrition Output</h3>
          <div className="feature-stats">
            <div className="stat-box"><strong>Calories</strong><small>420 kcal</small></div>
            <div className="stat-box"><strong>Protein</strong><small>22 g</small></div>
            <div className="stat-box"><strong>Carbs</strong><small>44 g</small></div>
            <div className="stat-box"><strong>Fats</strong><small>16 g</small></div>
          </div>
        </article>

        <article className="feature-card glass">
          <h3><Search size={16} /> Manual Food Search</h3>
          <form className="inline-form">
            <input placeholder="Search food (paneer, oats, chicken breast...)" />
            <button className="btn-primary" type="button">Search</button>
          </form>
        </article>

        <article className="feature-card glass">
          <h3><ShoppingCart size={16} /> Smart Shopping Integration</h3>
          <ul className="feature-list">
            <li>Suggested: Paneer, Greek yogurt, whey protein</li>
            <li>Supplements: Creatine monohydrate</li>
            <li>Redirect to Shopify / partner store APIs</li>
          </ul>
          <button className="btn-primary" type="button">Open Suggested Cart</button>
        </article>
      </section>
    </motion.div>
  )
}
