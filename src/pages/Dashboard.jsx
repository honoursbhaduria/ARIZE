import { motion } from 'framer-motion'
import { Bell, Camera, Flame, UserRound, ShieldCheck } from 'lucide-react'
import './FeaturePages.css'

export default function Dashboard() {
  return (
    <motion.div
      className="page-container feature-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <section className="feature-hero glass">
        <div className="feature-badge"><UserRound size={14} /> User System</div>
        <h1>User Signup, Login & Profile Setup</h1>
        <p>Email/Google auth, profile onboarding, daily dashboard, progress tracking, and secure JWT flow.</p>
        <div className="feature-stats">
          <div className="stat-box">
            <strong>14</strong>
            <small>Day streak</small>
          </div>
          <div className="stat-box">
            <strong>2,180</strong>
            <small>Calories burned</small>
          </div>
          <div className="stat-box">
            <strong>128g</strong>
            <small>Protein today</small>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <article className="feature-card glass">
          <h3>Auth (Email + Google)</h3>
          <form className="inline-form">
            <input placeholder="Email" />
            <input placeholder="Password" type="password" />
            <button className="btn-primary" type="button">Sign In</button>
            <button className="btn-primary" type="button">Continue with Google</button>
          </form>
        </article>

        <article className="feature-card glass">
          <h3>Profile Setup</h3>
          <form className="inline-form">
            <input placeholder="Age" />
            <input placeholder="Weight (kg)" />
            <select>
              <option>Goal: Muscle Gain</option>
              <option>Goal: Fat Loss</option>
              <option>Goal: Maintenance</option>
            </select>
            <select>
              <option>Diet Type: Vegetarian</option>
              <option>Diet Type: Eggetarian</option>
              <option>Diet Type: Non-Veg</option>
            </select>
            <button className="btn-primary" type="button">Save Profile</button>
          </form>
        </article>

        <article className="feature-card glass">
          <h3><Camera size={16} /> Progress & Transformation</h3>
          <p>Upload weekly photos and compare before/after snapshots side by side.</p>
          <ul className="feature-list">
            <li>Upload front/side/back progress photos</li>
            <li>Auto-date timeline for visual comparison</li>
            <li>Body-change confidence insights</li>
          </ul>
          <button className="btn-primary" type="button">Upload Photo</button>
        </article>

        <article className="feature-card glass">
          <h3><Bell size={16} /> Notification Center</h3>
          <ul className="feature-list">
            <li>Workout reminder at 6:00 PM</li>
            <li>Streak alert: You are close to 15 days</li>
            <li>Diet tip: Add 22g protein to hit target</li>
          </ul>
          <button className="btn-primary" type="button">Manage Alerts</button>
        </article>

        <article className="feature-card glass">
          <h3><Flame size={16} /> Progress Tracking</h3>
          <p className="kpi">+20%</p>
          <p>Weekly consistency improved over last month with lower missed workouts.</p>
          <div className="tag-row">
            <span className="tag">Weekly view</span>
            <span className="tag">Monthly trends</span>
            <span className="tag">Goal adherence</span>
          </div>
        </article>

        <article className="feature-card glass">
          <h3><ShieldCheck size={16} /> Security & Backend</h3>
          <ul className="feature-list">
            <li>JWT auth for access + refresh tokens</li>
            <li>Protected API routes with permissions</li>
            <li>Deployment target: Render / AWS ready</li>
          </ul>
        </article>
      </section>
    </motion.div>
  )
}
