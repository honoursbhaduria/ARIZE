import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Flame, 
  TrendingUp, 
  Target, 
  Award, 
  Activity,
  ChevronUp,
  ChevronDown,
  Calendar,
  Utensils
} from 'lucide-react'
import { fetchAnalytics, fetchAnalyticsOverview, fetchStreakLeaderboard } from '../services/api'
import { getActivityFeed, subscribeToActivityFeed } from '../services/activityFeed'
import './Analytics.css'

export default function Analytics() {
  const [consistencyData, setConsistencyData] = useState(null)
  const [overviewData, setAnalyticsOverview] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
   const [activityFeed, setActivityFeed] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAllData() {
      setLoading(true)
      try {
        const [cRes, oRes, lRes] = await Promise.all([
          fetchAnalytics(),
          fetchAnalyticsOverview(),
          fetchStreakLeaderboard()
        ])
        setConsistencyData(cRes)
        setAnalyticsOverview(oRes)
        setLeaderboard(lRes.leaderboard || [])
      } catch (e) {
        console.error("Analytics fetch failed", e)
      } finally {
        setLoading(false)
      }
    }
    loadAllData()
  }, [])

   useEffect(() => {
      setActivityFeed(getActivityFeed())
      const unsubscribe = subscribeToActivityFeed(setActivityFeed)
      return unsubscribe
   }, [])

  const workoutTrend = useMemo(() => {
    if (!overviewData?.chart_data?.workouts) return [40, 65, 30, 85, 45, 90, 60]
    return overviewData.chart_data.workouts.map(w => Math.min(100, (w.form_score || 50)))
  }, [overviewData])

  const nutritionTrend = useMemo(() => {
    if (!overviewData?.chart_data?.nutrition) return [30, 45, 60, 25, 80, 55, 40]
    const scores = overviewData.chart_data.nutrition.map(n => Math.min(100, (n.protein * 2)))
    return scores
  }, [overviewData])

  return (
    <motion.div 
      className="grid-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div style={{ gridColumn: 'span 12', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Performance Analysis</h1>
        <p className="text-muted">Real-time data synchronization with your training and nutrition logs.</p>
      </div>

      <div className="card analytics-timeline-card" style={{ gridColumn: 'span 12' }}>
         <div className="analytics-timeline-header">
            <div className="analytics-timeline-header-copy">
               <h3 style={{ fontSize: '1.125rem' }}>Live Activity Timeline</h3>
               <p className="text-muted" style={{ fontSize: '0.75rem' }}>Shows actions from Rep Counter, Progress Gallery, Nutrition & Shopping, and Settings.</p>
            </div>
            <div className="analytics-event-count">
               {activityFeed.length} total events
            </div>
         </div>

         {activityFeed.length === 0 ? (
            <div className="analytics-empty-feed">
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>No activity yet. Start a workout, upload a progress photo, update settings, or use nutrition/shopping to populate this feed.</p>
            </div>
         ) : (
            <div className="analytics-timeline-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
               {activityFeed.slice(0, 20).map(item => (
                  <div key={item.id} className="analytics-timeline-item" style={{ display: 'grid', gap: '0.75rem', alignItems: 'center', padding: '0.75rem 0.9rem', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--surface-hover)' }}>
                     <div className="analytics-timeline-source" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.75 }}>{item.source}</div>
                     <div className="analytics-timeline-content">
                        <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{item.action}</div>
                        {item.details ? <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>{item.details}</div> : null}
                     </div>
                     <div className="text-muted analytics-timeline-time" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{new Date(item.timestamp).toLocaleString()}</div>
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* Primary KPI Cards */}
      <div className="card" style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
         <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Consistency Score</div>
         <div style={{ fontSize: '2rem', fontWeight: 800 }}>{consistencyData?.weekly_consistency_score || 0}%</div>
         <div style={{ fontSize: '0.75rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <ChevronUp size={14} /> Tracking optimal
         </div>
      </div>

      <div className="card" style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
         <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Burn</div>
         <div style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            {overviewData?.calories_burned || 0} <span style={{ fontSize: '1rem', fontWeight: 400 }} className="text-muted">kcal</span>
         </div>
         <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>Accumulated this week</div>
      </div>

      <div className="card" style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
         <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Protein Intake</div>
         <div style={{ fontSize: '2rem', fontWeight: 800 }}>{overviewData?.protein_intake || 0}g</div>
         <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>Daily goal avg: 160g</div>
      </div>

      <div className="card" style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
         <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Streak Days</div>
         <div style={{ fontSize: '2rem', fontWeight: 800 }}>{consistencyData?.streak_days || 0}</div>
         <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>District: {consistencyData?.district || 'Global'}</div>
      </div>

      {/* Main Charts Area */}
      <div className="card" style={{ gridColumn: 'span 8', minHeight: '400px' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
               <h3 style={{ fontSize: '1.125rem' }}>Activity & Nutrition Trends</h3>
               <p className="text-muted" style={{ fontSize: '0.75rem' }}>Comparing form accuracy vs protein adherence</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
                  <div style={{ width: '8px', height: '8px', background: 'var(--accent)', borderRadius: '50%' }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Workouts</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Protein</span>
               </div>
            </div>
         </div>
         
         <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '250px', padding: '0 1rem', gap: '12px' }}>
            {workoutTrend.map((h, i) => (
               <div key={i} style={{ flex: 1, display: 'flex', gap: '4px', alignItems: 'flex-end', height: '100%' }}>
                  <div style={{ flex: 1, background: 'var(--accent)', borderRadius: '2px', height: `${h}%`, opacity: 0.8 }} />
                  <div style={{ flex: 1, background: '#4ade80', borderRadius: '2px', height: `${nutritionTrend[i] || 20}%`, opacity: 0.6 }} />
               </div>
            ))}
         </div>
         <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', padding: '0 1rem' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
               <span key={d} className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', flex: 1, textAlign: 'center' }}>{d}</span>
            ))}
         </div>
      </div>

      {/* Right Column: Insights & Leaderboard */}
      <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
         <div className="card">
            <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }} className="text-muted">
               {consistencyData?.district || 'Global'} Leaderboard
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {leaderboard.length > 0 ? leaderboard.map((u, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: u.rank === 1 ? 'rgba(255,255,255,0.03)' : 'transparent', borderRadius: 'var(--radius)', border: u.rank === 1 ? '1px solid var(--border)' : '1px solid transparent' }}>
                     <div style={{ fontSize: '0.75rem', fontWeight: 700, width: '20px', color: u.rank === 1 ? 'var(--accent)' : 'inherit' }}>{u.rank}</div>
                     <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600 }}>{u.username}</div>
                     <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{u.gamified_points} pts</div>
                        <div className="text-muted" style={{ fontSize: '0.65rem' }}>{u.streak_days}d streak</div>
                     </div>
                  </div>
               )) : <p className="text-muted" style={{ fontSize: '0.875rem' }}>Syncing leaderboard...</p>}
            </div>
         </div>

         <div className="card" style={{ background: 'var(--surface-hover)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
               <Award size={18} className="text-muted" />
               <h3 style={{ fontSize: '1.125rem' }}>AI Insights</h3>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, opacity: 0.8 }}>
               {consistencyData?.feedback?.[0] || "Maintain your current activity window to unlock new achievement badges. Your protein adherence is improving!"}
            </p>
         </div>
      </div>
    </motion.div>
  )
}
