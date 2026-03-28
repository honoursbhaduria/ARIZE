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
  ArrowRight,
  Sparkles,
  Loader2,
  Scale
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
  generateAIWorkoutPlan,
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

function getBMICategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: '#60a5fa' }
  if (bmi < 25) return { label: 'Normal', color: '#4ade80' }
  if (bmi < 30) return { label: 'Overweight', color: '#fb923c' }
  return { label: 'Obese', color: '#f87171' }
}

export default function Dashboard() {
  const user = useMemo(() => getCurrentUser(), [])
  const [loading, setLoading] = useState(true)
  const [workoutTasks, setWorkoutTasks] = useState(loadSavedWorkoutTasks)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [aiPlanPrompt, setAiPlanPrompt] = useState('')
  const [aiPlanLoading, setAiPlanLoading] = useState(false)
  const [showAiInput, setShowAiInput] = useState(false)
  const [workoutSummary, setWorkoutSummary] = useState({ total_sessions: 0, total_reps: 0, total_calories_burned: 0, avg_form_score: 0 })
  const [workoutSessions, setWorkoutSessions] = useState([])
  const [nutritionLogs, setNutritionLogs] = useState([])
  const [consistency, setConsistency] = useState({ streak_days: 0, missed_workouts: 0, weekly_consistency_score: 0, feedback: [] })
  const [profileData, setProfileData] = useState({ age: null, weight: null })

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

      const [summary, sessions, nutrition, consistencyRes, profile] = results
      if (summary.status === 'fulfilled') setWorkoutSummary(summary.value || {})
      if (sessions.status === 'fulfilled') setWorkoutSessions(Array.isArray(sessions.value) ? sessions.value : [])
      if (nutrition.status === 'fulfilled') setNutritionLogs(Array.isArray(nutrition.value) ? nutrition.value : [])
      if (consistencyRes.status === 'fulfilled') setConsistency(consistencyRes.value || {})
      if (profile.status === 'fulfilled') {
        const p = profile.value || {}
        setProfileData({ age: p.age ?? null, weight: p.weight ?? null })
      }
      setLoading(false)
    }
    loadData()
  }, [])

  useEffect(() => {
    localStorage.setItem(WORKOUT_TASKS_STORAGE_KEY, JSON.stringify(workoutTasks))
  }, [workoutTasks])

  useEffect(() => {
    const handleTasksUpdated = () => {
      setWorkoutTasks(loadSavedWorkoutTasks())
    }
    window.addEventListener('arize_tasks_updated', handleTasksUpdated)
    return () => window.removeEventListener('arize_tasks_updated', handleTasksUpdated)
  }, [])

  const todayKey = new Date().toISOString().slice(0, 10)
  const todayCalories = useMemo(() => {
    return nutritionLogs
      .filter((entry) => (entry.created_at || '').slice(0, 10) === todayKey)
      .reduce((sum, entry) => sum + Number(entry.calories || 0), 0)
  }, [nutritionLogs, todayKey])

  const todayProtein = useMemo(() => {
    return nutritionLogs
      .filter((entry) => (entry.created_at || '').slice(0, 10) === todayKey)
      .reduce((sum, entry) => sum + Number(entry.protein || 0), 0)
  }, [nutritionLogs, todayKey])

  const planDoneCount = workoutTasks.filter((task) => task.done).length
  const planProgressPct = workoutTasks.length > 0 ? Math.round((planDoneCount / workoutTasks.length) * 100) : 0

  const todayBurned = useMemo(() => {
    return workoutTasks.filter(t => t.done).reduce((sum, t) => sum + ((t.reps || 15) * 4), 0)
  }, [workoutTasks])

  const recentActivity = useMemo(() => workoutSessions.slice(0, 5), [workoutSessions])

  // BMI calculation
  const bmi = useMemo(() => {
    const { age, weight } = profileData
    if (!weight) return null
    const heightM = 1.70 // default height assumption
    return Math.round((weight / (heightM * heightM)) * 10) / 10
  }, [profileData])

  const bmiCategory = useMemo(() => bmi ? getBMICategory(bmi) : null, [bmi])

  // 7-day workout heatmap
  const last7Days = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const dayName = d.toLocaleDateString('en', { weekday: 'short' })
      const hasWorkout = workoutSessions.some(s => (s.created_at || '').slice(0, 10) === key)
      days.push({ key, dayName, hasWorkout })
    }
    return days
  }, [workoutSessions])

  // Daily exercise capacity: sessions per day of last 7 days
  const dailyCapacity = useMemo(() => {
    return last7Days.map(day => {
      const count = workoutSessions.filter(s => (s.created_at || '').slice(0, 10) === day.key).length
      return { ...day, count }
    })
  }, [last7Days, workoutSessions])

  const maxDailyCount = useMemo(() => Math.max(...dailyCapacity.map(d => d.count), 1), [dailyCapacity])

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

  const handleGenerateAIPlan = async () => {
    setAiPlanLoading(true)
    try {
      const result = await generateAIWorkoutPlan(aiPlanPrompt || 'Create a balanced full-body workout for today')
      if (result?.plan && Array.isArray(result.plan) && result.plan.length > 0) {
        setWorkoutTasks(result.plan)
      }
    } catch (e) {
      console.error('AI plan generation failed', e)
    } finally {
      setAiPlanLoading(false)
      setShowAiInput(false)
      setAiPlanPrompt('')
    }
  }

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
          <Flame size={20} style={{ color: '#fb923c' }} />
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Calories Burned</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{todayBurned.toLocaleString()} kcal</div>
        </div>
      </div>

      <div className="card" style={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
          <Activity size={20} />
        </div>
        <div>
          <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>
            Calories Eaten <span style={{ color: 'var(--accent)' }}>• {Math.round(todayProtein)}g PRO</span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{Math.round(todayCalories)} kcal</div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.5rem', background: 'var(--surface-hover)', borderRadius: '2px' }}>
                {planDoneCount} / {workoutTasks.length} DONE
              </span>
              <button
                onClick={() => setShowAiInput(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.3rem 0.75rem', background: 'var(--accent)', color: 'var(--bg)', borderRadius: 'var(--radius)', letterSpacing: '0.04em' }}
              >
                <Sparkles size={14} /> AI Plan
              </button>
            </div>
          </div>

          {/* AI Plan Generator */}
          {showAiInput && (
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <input
                placeholder="e.g. upper body strength, 30 min HIIT, leg day..."
                value={aiPlanPrompt}
                onChange={e => setAiPlanPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerateAIPlan()}
                style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', padding: '0.6rem 0.75rem', color: 'var(--text-primary)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}
                autoFocus
              />
              <button
                onClick={handleGenerateAIPlan}
                disabled={aiPlanLoading}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }}
              >
                {aiPlanLoading ? <Loader2 size={14} className="spinner" /> : <Sparkles size={14} />}
                {aiPlanLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          )}

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

        {/* BMI Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Scale size={18} className="text-muted" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Your BMI</h3>
          </div>
          {bmi ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: bmiCategory?.color }}>{bmi}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: bmiCategory?.color }}>{bmiCategory?.label}</div>
              </div>
              {/* BMI Scale Bar */}
              <div style={{ position: 'relative', height: '8px', background: 'linear-gradient(to right, #60a5fa 0%, #4ade80 18.5%, #4ade80 25%, #fb923c 25%, #fb923c 30%, #f87171 30%)', borderRadius: '4px', marginBottom: '0.75rem' }}>
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  left: `${Math.min(Math.max(((bmi - 10) / 30) * 100, 2), 98)}%`,
                  width: '16px',
                  height: '16px',
                  background: bmiCategory?.color,
                  borderRadius: '50%',
                  border: '2px solid var(--bg)',
                  transform: 'translateX(-50%)',
                  transition: 'left 0.5s ease'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', opacity: 0.5, fontWeight: 700 }}>
                <span>10</span><span>18.5</span><span>25</span><span>30</span><span>40+</span>
              </div>
              <div className="text-muted" style={{ fontSize: '0.7rem', marginTop: '0.75rem' }}>
                Based on weight {profileData.weight}kg · height 170cm
              </div>
            </>
          ) : (
            <div className="text-muted" style={{ fontSize: '0.875rem' }}>
              Complete your profile with age & weight to see BMI.
              <Link to="/quiz" style={{ display: 'block', marginTop: '0.5rem', color: 'var(--accent)', fontWeight: 700, fontSize: '0.75rem' }}>→ Update Profile</Link>
            </div>
          )}
        </div>

        {/* Consistency Block — 7-day heatmap */}
        <div className="card">
          <div className="text-muted" style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Today Focus</div>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Consistency Block</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1rem' }}>
            {last7Days.map((day) => (
              <div key={day.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: day.hasWorkout ? 'var(--accent)' : 'var(--surface-hover)',
                  border: `1px solid ${day.hasWorkout ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }} title={day.key}>
                  {day.hasWorkout && <CheckCircle2 size={14} style={{ color: 'var(--bg)' }} />}
                </div>
                <span style={{ fontSize: '0.55rem', fontWeight: 700, opacity: 0.5 }}>{day.dayName}</span>
              </div>
            ))}
          </div>
          <p className="text-muted" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
            {planDoneCount === workoutTasks.length && workoutTasks.length > 0
              ? "All tasks done today! 🎉 Great streak maintenance."
              : `Complete ${workoutTasks.length - planDoneCount} more exercise${workoutTasks.length - planDoneCount !== 1 ? 's' : ''} to maintain your streak.`}
          </p>
        </div>

        {/* Daily Exercise Capacity */}
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }} className="text-muted">
            Daily Exercise Capacity
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '120px', padding: '0 0.5rem', gap: '4px' }}>
            {dailyCapacity.map((day, i) => {
              const heightPct = maxDailyCount > 0 ? Math.max(10, (day.count / maxDailyCount) * 100) : 10
              const isToday = day.key === todayKey
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${heightPct}%`,
                    background: isToday ? 'var(--accent)' : (day.count > 0 ? 'rgba(255,255,255,0.3)' : 'var(--border)'),
                    borderRadius: '2px',
                    transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                  }}
                  title={`${day.count} exercise${day.count !== 1 ? 's' : ''}`}
                />
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', padding: '0 0.5rem' }}>
            {dailyCapacity.map((day, i) => (
              <span key={i} style={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.5 }}>{day.dayName[0]}</span>
            ))}
          </div>
          <div className="text-muted" style={{ fontSize: '0.7rem', marginTop: '0.75rem', textAlign: 'center' }}>
            Sessions per day this week
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
                <div style={{ width: '4px', height: '24px', background: 'var(--accent)', borderRadius: '2px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{session.exercise_name}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>{session.reps} reps • {session.calories_burned} kcal</div>
                </div>
              </div>
            )) : <p className="text-muted" style={{ fontSize: '0.875rem' }}>No recent activity. Complete a Workout Coach session!</p>}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Link to="/vision" className="card" style={{ padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={20} className="text-muted" />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>AI Tracking</span>
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
