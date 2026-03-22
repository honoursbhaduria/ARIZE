import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Flame, 
  Dumbbell, 
  Activity, 
  TrendingUp, 
  Plus, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Camera,
  Settings as SettingsIcon,
  User,
  Bell,
  CalendarClock,
  Trash2,
  Save,
  ArrowRight
} from 'lucide-react'
import AIChainFlow from '../components/AIChainFlow'
import {
  fetchWorkoutSummary,
  fetchWorkoutSessions,
  fetchNutritionLogs,
  fetchAnalytics,
  fetchProfile,
  updateProfile,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  uploadProgressPhoto,
  saveWorkoutSession,
  getCurrentUser,
} from '../services/api'

const WORKOUT_TASKS_STORAGE_KEY = 'arize_today_workout_tasks_v1'
const DEFAULT_WORKOUT_TASKS = [
  { id: 'squats', title: 'Squats', details: '3 sets x 12 reps', reps: 36, done: false },
  { id: 'pushups', title: 'Push-ups', details: '3 sets x 12 reps', reps: 36, done: false },
  { id: 'lunges', title: 'Lunges', details: '3 sets x 12 reps per leg', reps: 24, done: false },
  { id: 'plank', title: 'Plank', details: '3 sets x 30 sec hold', reps: 3, done: false },
]

function loadSavedWorkoutTasks() {
  if (typeof window === 'undefined') return DEFAULT_WORKOUT_TASKS
  try {
    const raw = localStorage.getItem(WORKOUT_TASKS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_WORKOUT_TASKS
  } catch {
    return DEFAULT_WORKOUT_TASKS
  }
}

export default function Dashboard() {
  const user = useMemo(() => getCurrentUser(), [])
  const [loading, setLoading] = useState(true)
  const [workoutTasks, setWorkoutTasks] = useState(loadSavedWorkoutTasks)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [workoutSummary, setWorkoutSummary] = useState({ total_sessions: 0, total_reps: 0, avg_form_score: 0 })
  const [workoutSessions, setWorkoutSessions] = useState([])
  const [nutritionLogs, setNutritionLogs] = useState([])
  const [consistency, setConsistency] = useState({ streak_days: 0, missed_workouts: 0, weekly_consistency_score: 0, feedback: [] })
  const [profileForm, setProfileForm] = useState({ age: '', weight: '', district: 'global', goal: 'maintenance', diet_type: 'vegetarian' })
  const [pendingAction, setPendingAction] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const results = await Promise.allSettled([
        fetchWorkoutSummary(),
        fetchWorkoutSessions(),
        fetchNutritionLogs(),
        fetchAnalytics(),
        fetchProfile(),
      ])
      
      const [summary, sessions, nutrition, consistency, profile] = results
      if (summary.status === 'fulfilled') setWorkoutSummary(summary.value || {})
      if (sessions.status === 'fulfilled') setWorkoutSessions(Array.isArray(sessions.value) ? sessions.value : [])
      if (nutrition.status === 'fulfilled') setNutritionLogs(Array.isArray(nutrition.value) ? nutrition.value : [])
      if (consistency.status === 'fulfilled') setConsistency(consistency.value || {})
      if (profile.status === 'fulfilled') {
        const p = profile.value || {}
        setProfileForm({
          age: p.age ?? '',
          weight: p.weight ?? '',
          district: p.district || 'global',
          goal: p.goal || 'maintenance',
          diet_type: p.diet_type || 'vegetarian',
        })
      }
      setLoading(false)
    }
    loadData()
  }, [])

  useEffect(() => {
    localStorage.setItem(WORKOUT_TASKS_STORAGE_KEY, JSON.stringify(workoutTasks))
  }, [workoutTasks])

  const todayKey = new Date().toISOString().slice(0, 10)
  const todayProtein = useMemo(() => {
    return nutritionLogs
      .filter((entry) => (entry.created_at || '').slice(0, 10) === todayKey)
      .reduce((sum, entry) => sum + Number(entry.protein || 0), 0)
  }, [nutritionLogs, todayKey])

  const planDoneCount = workoutTasks.filter((task) => task.done).length
  const planProgressPct = workoutTasks.length > 0 ? Math.round((planDoneCount / workoutTasks.length) * 100) : 0

  const recentActivity = useMemo(() => workoutSessions.slice(0, 5), [workoutSessions])

  const handleToggleTask = (taskId) => {
    setWorkoutTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !t.done } : t))
  }

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return
    const task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      details: 'Custom task',
      reps: 20,
      done: false,
    }
    setWorkoutTasks(prev => [...prev, task])
    setNewTaskTitle('')
  }

  const handleDeleteTask = (taskId) => {
    setWorkoutTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const progressBars = useMemo(() => {
    // Take last 7 sessions
    const source = [...workoutSessions].reverse().slice(0, 7)
    
    // Default data if none exists
    if (!source.length) return [
      { val: 65, active: false },
      { val: 72, active: false },
      { val: 68, active: false },
      { val: 85, active: false },
      { val: 77, active: false },
      { val: 92, active: true },
      { val: 88, active: false }
    ]

    const scores = source.map(s => Number(s.form_score || 0))
    const maxScore = Math.max(...scores)
    
    return scores.map(score => ({
      val: Math.max(15, score), // Min height for visibility
      active: score === maxScore && score > 0
    }))
  }, [workoutSessions])

  return (
    <motion.div 
      className="grid-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header Section */}
      <div style={{ gridColumn: 'span 12', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Welcome, {user?.username || 'User'}</h1>
          <p className="text-muted">Track your profile, training, and recovery in one place.</p>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="card" style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
          <Flame size={20} />
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Streak</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{consistency.streak_days || 0} Days</div>
        </div>
      </div>

      <div className="card" style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
          <Dumbbell size={20} />
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Reps</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{(workoutSummary.total_reps || 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="card" style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
          <Activity size={20} />
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Protein</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{Math.round(todayProtein)}g</div>
        </div>
      </div>

      <div className="card" style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
          <CheckCircle2 size={20} />
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Completion</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{planProgressPct}%</div>
        </div>
      </div>

      {/* AI Chain Visualization */}
      <div className="card" style={{ gridColumn: 'span 12' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <TrendingUp size={16} className="text-muted" />
          <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Processing Pipeline</h3>
        </div>
        <AIChainFlow />
      </div>

      {/* Left Column */}
      <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Workout Plan Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Dumbbell size={18} />
              <h3 style={{ fontSize: '1.125rem' }}>Today Workout Plan</h3>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.5rem', background: 'var(--surface-hover)', borderRadius: '2px' }}>
              {planDoneCount} / {workoutTasks.length} DONE
            </span>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <input 
              placeholder="Add a task (e.g., 20 min run)"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTask()}
              style={{ flex: 1, background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '0.75rem', color: 'var(--text-primary)', borderRadius: 'var(--radius)' }}
            />
            <button onClick={handleAddTask} className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>Add</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {workoutTasks.map(task => (
              <div 
                key={task.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  padding: '1rem', 
                  background: task.done ? 'transparent' : 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  opacity: task.done ? 0.5 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                <button 
                  onClick={() => handleToggleTask(task.id)}
                  style={{ color: task.done ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  {task.done ? <CheckCircle2 size={20} /> : <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderRadius: '50%' }} />}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>{task.details}</div>
                </div>
                <button onClick={() => handleDeleteTask(task.id)} className="text-muted" style={{ opacity: 0.5 }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>
              <span>PLAN PROGRESS</span>
              <span>{planProgressPct}%</span>
            </div>
            <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
              <div style={{ width: `${planProgressPct}%`, height: '100%', background: 'var(--accent)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        </div>

        {/* AI Suggestions Card */}
        <div className="card" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <TrendingUp size={18} />
            <h3 style={{ fontSize: '1.125rem' }}>AI Coach Insight</h3>
          </div>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.6, marginBottom: '1.5rem', opacity: 0.9 }}>
            Based on your recent form score of {workoutSummary.avg_form_score}% and {consistency.streak_days}-day streak, I recommend focusing on {planProgressPct < 100 ? 'completing your pending tasks' : 'recovery and mobility'} today.
          </p>
          <Link to="/chat" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 800 }}>
            OPEN COACH CHAT <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Right Column */}
      <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Today Focus */}
        <div className="card">
          <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Today Focus</div>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Consistency Block</h3>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Complete {workoutTasks.length - planDoneCount} more exercises to maintain your current streak pace.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
             <div style={{ flex: 1, padding: '0.75rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                <CalendarClock size={16} className="text-muted" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>25-35 min</div>
             </div>
             <div style={{ flex: 1, padding: '0.75rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                <Activity size={16} className="text-muted" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Moderate</div>
             </div>
          </div>
        </div>

        {/* Progress Graph */}
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }} className="text-muted">
            Form Score Trend
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '120px', padding: '0 0.5rem', gap: '4px' }}>
            {progressBars.map((bar, i) => (
              <div 
                key={i} 
                style={{ 
                  flex: 1,
                  height: `${bar.val}%`, 
                  background: bar.active ? 'var(--accent)' : 'var(--border)', 
                  borderRadius: '2px',
                  transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }} 
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', padding: '0 0.5rem' }}>
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <span key={i} style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.5 }}>{d}</span>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }} className="text-muted">
            Recent Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentActivity.length > 0 ? recentActivity.map((session, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '4px', height: '24px', background: 'var(--border)', borderRadius: '2px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{session.exercise_name}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>{session.reps} reps • {session.calories_burned} kcal</div>
                </div>
              </div>
            )) : <p className="text-muted" style={{ fontSize: '0.875rem' }}>No recent activity.</p>}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Link to="/vision" className="card" style={{ padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={20} className="text-muted" />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Vision</span>
          </Link>
          <Link to="/analytics" className="card" style={{ padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} className="text-muted" />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Insights</span>
          </Link>
          <Link to="/settings" className="card" style={{ padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <SettingsIcon size={20} className="text-muted" />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Profile</span>
          </Link>
          <Link to="/integrations" className="card" style={{ padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={20} className="text-muted" />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Sync</span>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
