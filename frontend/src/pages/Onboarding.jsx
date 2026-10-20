import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, Check, ChevronLeft, ChevronRight, HeartPulse, MapPin, Search, Target, User, Zap } from 'lucide-react'
import { districtsQuery, useUpdateProfile } from '../lib/queries'
import Logo from '../components/Logo'
import { DIET_OPTIONS, GENDER_OPTIONS, GOAL_OPTIONS, cleanProfilePayload } from '../lib/profile'
import { Alert, Button, Field, Input, ProgressBar, Textarea } from '../ui/components'

const BASE_STEPS = [
  {
    id: 'basics',
    title: 'Body stats',
    description: 'Calibrate your AI coach with a few basics.',
    icon: User,
    fields: [
      { key: 'age', label: 'Age', type: 'number', placeholder: '25' },
      { key: 'weight', label: 'Weight (kg)', type: 'number', placeholder: '70' },
      { key: 'gender', label: 'Gender', type: 'choice', options: GENDER_OPTIONS },
    ],
  },
  {
    id: 'goal',
    title: 'Choose your path',
    description: 'What are you training for?',
    icon: Target,
    fields: [{ key: 'goal', label: 'Primary goal', type: 'choice', options: GOAL_OPTIONS }],
  },
  {
    id: 'medical',
    title: 'Fuel type',
    description: 'Your diet shapes every meal suggestion.',
    icon: HeartPulse,
    fields: [{ key: 'diet_type', label: 'Dietary preference', type: 'choice', options: DIET_OPTIONS }],
  },
  {
    id: 'activity',
    title: 'Training level',
    description: 'How often do you train right now?',
    icon: Activity,
    fields: [
      {
        key: 'activity_level',
        label: 'Weekly sessions',
        type: 'choice',
        options: [
          { value: 'sedentary', label: '0–1 sessions', hint: 'Rookie' },
          { value: 'moderate', label: '2–4 sessions', hint: 'Active' },
          { value: 'heavy', label: '5+ sessions', hint: 'Pro' },
        ],
      },
    ],
  },
  {
    id: 'location',
    title: 'Join a district',
    description: 'Compete on your local streak leaderboard.',
    icon: MapPin,
    fields: [{ key: 'district', label: 'District', type: 'searchable' }],
  },
]

const FEMALE_HEALTH_CYCLE_STEP = {
  id: 'women_health_cycle',
  title: "Women's health: cycle",
  description: 'Track cycle basics for better recovery and load planning.',
  icon: HeartPulse,
  fields: [
    { key: 'women_health.cycle_length_days', label: 'Cycle length (days)', type: 'number', placeholder: '28' },
    { key: 'women_health.period_duration_days', label: 'Period duration (days)', type: 'number', placeholder: '5' },
    { key: 'women_health.last_period_date', label: 'Last period date', type: 'date' },
    {
      key: 'women_health.cycle_regularity',
      label: 'Cycle regularity',
      type: 'choice',
      options: [
        { value: 'regular', label: 'Regular' },
        { value: 'irregular', label: 'Irregular' },
      ],
    },
  ],
}

const FEMALE_HEALTH_WELLBEING_STEP = {
  id: 'women_health_wellbeing',
  title: "Women's health: wellbeing",
  description: 'Mood and symptoms keep coaching realistic and supportive.',
  icon: HeartPulse,
  fields: [
    {
      key: 'women_health.mood_pattern',
      label: 'Behavior pattern',
      type: 'choice',
      options: [
        { value: 'stable', label: 'Stable' },
        { value: 'irritable', label: 'Irritable' },
        { value: 'anxious', label: 'Anxious' },
        { value: 'low_energy', label: 'Low energy' },
      ],
    },
    { key: 'women_health.symptoms', label: 'Common symptoms', type: 'textarea', placeholder: 'e.g. cramps, bloating, headache' },
    { key: 'women_health.behavior_notes', label: 'Additional notes', type: 'textarea', placeholder: 'Anything else to help personalise coaching' },
  ],
}

const INITIAL_FORM = {
  age: '',
  weight: '',
  goal: 'maintenance',
  diet_type: 'vegetarian',
  gender: 'other',
  activity_level: 'moderate',
  district: 'Global (International)',
  women_health: {
    cycle_length_days: '',
    period_duration_days: '',
    last_period_date: '',
    cycle_regularity: 'regular',
    mood_pattern: 'stable',
    behavior_notes: '',
    symptoms: '',
  },
}

function ChoiceGroup({ field, value, onChange }) {
  return (
    <div className="grid-2" role="radiogroup" aria-label={field.label} style={{ gap: 10 }}>
      {field.options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className="list-row"
            style={{
              minHeight: 56,
              borderColor: selected ? 'var(--gold)' : undefined,
              background: selected ? 'rgba(255, 200, 61, 0.1)' : undefined,
              textAlign: 'left',
            }}
          >
            <span className="grow">
              <span style={{ fontWeight: 700, display: 'block' }}>{option.label}</span>
              {option.hint && <span className="tiny muted">{option.hint}</span>}
            </span>
            {selected && <Check size={18} color="var(--gold)" strokeWidth={3} />}
          </button>
        )
      })}
    </div>
  )
}

function DistrictPicker({ value, onChange }) {
  const [search, setSearch] = useState('')
  const districts = useQuery(districtsQuery)
  const filtered = useMemo(() => {
    const list = districts.data || []
    const term = search.toLowerCase()
    return (term ? list.filter((d) => d.toLowerCase().includes(term)) : list).slice(0, 60)
  }, [districts.data, search])

  return (
    <div className="stack-sm">
      <div className="list-row" style={{ borderColor: 'var(--gold)' }}>
        <MapPin size={18} color="var(--gold)" />
        <span className="grow truncate" style={{ fontWeight: 700 }}>{value}</span>
      </div>
      <div className="input-icon">
        <Search size={18} />
        <Input placeholder="Search districts…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search districts" />
      </div>
      <div className="stack-sm" style={{ maxHeight: 240, overflowY: 'auto' }}>
        {districts.isLoading && <p className="small muted center" style={{ padding: 16 }}>Loading districts…</p>}
        {!districts.isLoading && filtered.length === 0 && <p className="small muted center" style={{ padding: 16 }}>No districts found.</p>}
        {filtered.map((district) => (
          <button
            key={district}
            type="button"
            onClick={() => onChange(district)}
            className="nav-link"
            style={{ justifyContent: 'space-between', color: district === value ? 'var(--gold)' : undefined }}
          >
            <span className="truncate">{district}</span>
            {district === value && <Check size={16} />}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const updateProfile = useUpdateProfile()
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isFinished, setIsFinished] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM)

  const steps = useMemo(() => {
    if (formData.gender === 'female') {
      return [...BASE_STEPS.slice(0, 3), FEMALE_HEALTH_CYCLE_STEP, FEMALE_HEALTH_WELLBEING_STEP, ...BASE_STEPS.slice(3)]
    }
    return BASE_STEPS
  }, [formData.gender])

  const stepIndex = Math.min(currentStep, steps.length - 1)
  const step = steps[stepIndex]
  const Icon = step.icon
  const isLast = stepIndex === steps.length - 1
  const progress = ((stepIndex + 1) / steps.length) * 100

  const getFieldValue = (key) => {
    if (!key.includes('.')) return formData[key] ?? ''
    const [root, childKey] = key.split('.')
    return formData[root]?.[childKey] ?? ''
  }

  const setFieldValue = (key, value) => {
    if (!key.includes('.')) {
      setFormData((prev) => ({ ...prev, [key]: value }))
      return
    }
    const [root, childKey] = key.split('.')
    setFormData((prev) => ({ ...prev, [root]: { ...(prev[root] || {}), [childKey]: value } }))
  }

  const handleSubmit = () => {
    const payload = cleanProfilePayload({
      ...formData,
      women_health: formData.gender === 'female' ? formData.women_health : undefined,
    })
    updateProfile.mutate(payload, {
      onSuccess: () => {
        setIsFinished(true)
        setTimeout(() => navigate({ to: '/dashboard' }), 1600)
      },
    })
  }

  const goNext = () => {
    if (isLast) {
      handleSubmit()
      return
    }
    setDirection(1)
    setCurrentStep(stepIndex + 1)
  }

  const goBack = () => {
    setDirection(-1)
    setCurrentStep(Math.max(0, stepIndex - 1))
  }

  if (isFinished) {
    return (
      <div className="page" style={{ minHeight: '100dvh', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0.6, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', damping: 12 }}>
          <span className="icon-tile icon-tile--green icon-tile--lg" style={{ width: 96, height: 96, borderRadius: 28 }}>
            <Zap size={48} />
          </span>
        </motion.div>
        <motion.h1 initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} style={{ fontSize: 'clamp(2rem, 7vw, 3rem)' }}>
          Character created!
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="muted">
          +100 XP · Your coach is tuned to your profile. Loading Home Base…
        </motion.p>
      </div>
    )
  }

  return (
    <div className="page" style={{ maxWidth: 560, minHeight: '100dvh', justifyContent: 'center' }}>
      <div className="spread">
        <Logo size="sm" to="/dashboard" />
        <span className="eyebrow">Step {stepIndex + 1} / {steps.length}</span>
      </div>
      <ProgressBar value={progress} tone="gold" label="Setup progress" />

      <div className="card stack" style={{ overflow: 'hidden' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step.id}
            className="stack"
            initial={{ opacity: 0, x: 24 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 * direction }}
            transition={{ duration: 0.25 }}
          >
            <div className="row">
              <span className="icon-tile icon-tile--lg"><Icon size={26} /></span>
              <div className="grow">
                <h1 style={{ fontSize: '1.6rem' }}>{step.title}</h1>
                <p className="muted small">{step.description}</p>
              </div>
            </div>

            {step.fields.map((field) => (
              <Field key={field.key} label={field.label} htmlFor={field.key}>
                {field.type === 'choice' ? (
                  <ChoiceGroup field={field} value={getFieldValue(field.key)} onChange={(v) => setFieldValue(field.key, v)} />
                ) : field.type === 'searchable' ? (
                  <DistrictPicker value={formData.district} onChange={(v) => setFieldValue('district', v)} />
                ) : field.type === 'textarea' ? (
                  <Textarea id={field.key} rows={3} placeholder={field.placeholder} value={getFieldValue(field.key)} onChange={(e) => setFieldValue(field.key, e.target.value)} />
                ) : (
                  <Input
                    id={field.key}
                    type={field.type}
                    inputMode={field.type === 'number' ? 'numeric' : undefined}
                    min={field.type === 'number' ? 0 : undefined}
                    placeholder={field.placeholder}
                    value={getFieldValue(field.key)}
                    onChange={(e) => setFieldValue(field.key, e.target.value)}
                  />
                )}
              </Field>
            ))}
          </motion.div>
        </AnimatePresence>

        {updateProfile.isError && <Alert tone="error">{updateProfile.error?.message || 'Could not save your profile. Try again.'}</Alert>}

        <div className="row" style={{ marginTop: 8 }}>
          {stepIndex > 0 && (
            <Button variant="ghost" size="lg" icon={ChevronLeft} onClick={goBack} disabled={updateProfile.isPending}>
              Back
            </Button>
          )}
          <Button variant="primary" size="lg" className="grow" onClick={goNext} loading={updateProfile.isPending}>
            {isLast ? 'Finish setup' : 'Next'} {!updateProfile.isPending && <ChevronRight size={20} />}
          </Button>
        </div>
      </div>

      <button type="button" className="link small center" style={{ color: 'var(--text-dim)', alignSelf: 'center' }} onClick={() => navigate({ to: '/dashboard' })}>
        Skip for now
      </button>
    </div>
  )
}
