import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Award, Crown, Flame, History, Medal, Target, Trophy, Utensils } from 'lucide-react'
import { getCurrentUser } from '../services/api'
import { getActivityFeed, subscribeToActivityFeed } from '../services/activityFeed'
import { consistencyQuery, leaderboardQuery, nutritionLogsQuery, overviewQuery, usePlayerStats, workoutSessionsQuery } from '../lib/queries'
import { lastSevenDays } from '../lib/health'
import { Badge, Card, CardHeader, EmptyState, PageHeader, ProgressBar, Skeleton } from '../ui/components'

const AXIS_TICK = { fill: '#a3a1c2', fontSize: 12 }

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card" style={{ padding: '8px 12px', borderRadius: 10 }}>
      <div className="tiny muted">{label}</div>
      <div className="mono" style={{ fontWeight: 700 }}>{payload[0].value} {unit}</div>
    </div>
  )
}

function DailyBarChart({ data, dataKey, color, unit, label }) {
  return (
    <div style={{ height: 200 }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#2a2a46" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const RANK_ICON = { 1: Crown, 2: Medal, 3: Medal }

export default function Analytics() {
  const me = getCurrentUser()
  const stats = usePlayerStats()
  const consistency = useQuery(consistencyQuery)
  const overview = useQuery(overviewQuery)
  const leaderboard = useQuery(leaderboardQuery)
  const sessions = useQuery(workoutSessionsQuery)
  const nutrition = useQuery(nutritionLogsQuery)
  const [activityFeed, setActivityFeed] = useState(getActivityFeed)

  useEffect(() => subscribeToActivityFeed(setActivityFeed), [])

  // Real per-day series for the last 7 calendar days.
  const repsPerDay = useMemo(
    () => lastSevenDays(sessions.data || []).map((day) => ({
      label: day.label,
      reps: day.items.reduce((sum, s) => sum + Number(s.reps || 0), 0),
    })),
    [sessions.data],
  )
  const proteinPerDay = useMemo(
    () => lastSevenDays(nutrition.data || []).map((day) => ({
      label: day.label,
      protein: Math.round(day.items.reduce((sum, n) => sum + Number(n.protein || 0), 0)),
    })),
    [nutrition.data],
  )

  const district = consistency.data?.district || 'Global'
  const score = consistency.data?.weekly_consistency_score || 0

  return (
    <div className="page">
      <PageHeader eyebrow="Progress" title="Stats & Streaks" subtitle="Your training, nutrition and rank, synced from every session." />

      <div className="grid-4">
        <Card className="stack-sm">
          <span className="stat__label row" style={{ gap: 6 }}><Target size={14} className="violet" /> Consistency</span>
          <span className="stat__value">{score}%</span>
          <ProgressBar value={score} size="sm" label="Weekly consistency" />
        </Card>
        <Card className="stack-sm">
          <span className="stat__label row" style={{ gap: 6 }}><Flame size={14} style={{ color: 'var(--orange)' }} /> Total burn</span>
          <span className="stat__value">{overview.data?.calories_burned ?? 0}</span>
          <span className="stat__hint">kcal this week</span>
        </Card>
        <Card className="stack-sm">
          <span className="stat__label row" style={{ gap: 6 }}><Utensils size={14} className="green" /> Protein</span>
          <span className="stat__value">{overview.data?.protein_intake ?? 0}g</span>
          <span className="stat__hint">Daily goal avg: 160g</span>
        </Card>
        <Card className="stack-sm">
          <span className="stat__label row" style={{ gap: 6 }}><Trophy size={14} className="gold" /> Level</span>
          <span className="stat__value">{stats.level}</span>
          <span className="stat__hint">{stats.title} · {stats.streakDays}d streak</span>
        </Card>
      </div>

      <div className="split">
        <div className="stack">
          <div className="grid-2">
            <Card>
              <CardHeader title="Reps per day" subtitle="Last 7 days" />
              {sessions.isLoading ? <Skeleton height={200} /> : <DailyBarChart data={repsPerDay} dataKey="reps" color="#8b6cff" unit="reps" label="Reps per day for the last 7 days" />}
            </Card>
            <Card>
              <CardHeader title="Protein per day" subtitle="Last 7 days" />
              {nutrition.isLoading ? <Skeleton height={200} /> : <DailyBarChart data={proteinPerDay} dataKey="protein" color="#3ddc84" unit="g" label="Protein grams per day for the last 7 days" />}
            </Card>
          </div>

          <Card>
            <CardHeader icon={History} tone="blue" title="Activity timeline" subtitle="Workouts, photos, nutrition and settings changes" action={<Badge>{activityFeed.length} events</Badge>} />
            {activityFeed.length === 0 ? (
              <EmptyState>No activity yet. Train, upload a photo or log a meal to fill this feed.</EmptyState>
            ) : (
              <ul className="list" style={{ maxHeight: 360, overflowY: 'auto' }}>
                {activityFeed.slice(0, 20).map((item) => (
                  <li key={item.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                    <div className="grow">
                      <div className="eyebrow" style={{ fontSize: '0.65rem' }}>{item.source}</div>
                      <div style={{ fontWeight: 700 }}>{item.action}</div>
                      {item.details && <div className="small muted">{item.details}</div>}
                    </div>
                    <time className="tiny dim" style={{ whiteSpace: 'nowrap' }} dateTime={item.timestamp}>
                      {new Date(item.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="stack">
          <Card tone="gold">
            <CardHeader icon={Trophy} title={`${district} leaderboard`} />
            {leaderboard.isLoading ? (
              <div className="stack-sm">{[0, 1, 2].map((i) => <Skeleton key={i} height={52} />)}</div>
            ) : leaderboard.data?.length ? (
              <ol className="list">
                {leaderboard.data.map((entry) => {
                  const Icon = RANK_ICON[entry.rank]
                  const isMe = entry.username === me?.username
                  return (
                    <li key={`${entry.rank}-${entry.username}`} className="list-row" style={{ borderColor: isMe ? 'var(--gold)' : undefined }}>
                      <span className="mono" style={{ width: 26, fontWeight: 700, color: entry.rank <= 3 ? 'var(--gold)' : 'var(--text-dim)' }}>
                        {Icon ? <Icon size={18} /> : entry.rank}
                      </span>
                      <span className="grow truncate" style={{ fontWeight: 700 }}>
                        {entry.username} {isMe && <Badge tone="gold">You</Badge>}
                      </span>
                      <span style={{ textAlign: 'right' }}>
                        <span className="mono" style={{ display: 'block', fontWeight: 700 }}>{entry.gamified_points} pts</span>
                        <span className="tiny dim">{entry.streak_days}d streak</span>
                      </span>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="small muted">No rankings in your district yet. Train today to claim the top spot.</p>
            )}
          </Card>

          <Card>
            <CardHeader icon={Award} tone="violet" title="AI insight" />
            <p className="muted">
              {consistency.data?.feedback?.[0] || 'Keep your current training window to unlock new titles. Your protein adherence is improving!'}
            </p>
            {consistency.data?.feedback?.[1] && <p className="small dim" style={{ marginTop: 8 }}>{consistency.data.feedback[1]}</p>}
          </Card>
        </div>
      </div>
    </div>
  )
}
