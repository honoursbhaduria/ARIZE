import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  User, 
  Target, 
  MapPin, 
  ArrowRight,
  Sparkles,
  Dumbbell,
  ShieldCheck,
  Zap,
  ChevronRight,
  ChevronLeft,
  Activity,
  HeartPulse,
  Search,
  Check
} from 'lucide-react'
import { updateProfile } from '../services/api'

const BASE_STEPS = [
  {
    id: 'basics',
    title: 'Personal Metrics',
    description: 'Calibrate your AI coaching core.',
    icon: User,
    fields: [
      { key: 'age', label: 'Age', type: 'number', placeholder: '25' },
      { key: 'weight', label: 'Weight (kg)', type: 'number', placeholder: '70' },
      {
        key: 'gender',
        label: 'Gender',
        type: 'select',
        options: [
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'other', label: 'Other' }
        ]
      }
    ]
  },
  {
    id: 'goal',
    title: 'Training Goal',
    description: 'Define your primary focus.',
    icon: Target,
    fields: [
      { 
        key: 'goal', 
        label: 'Primary Goal', 
        type: 'select', 
        options: [
          { value: 'fat_loss', label: 'Fat Loss' },
          { value: 'muscle_gain', label: 'Muscle Gain' },
          { value: 'maintenance', label: 'Maintenance' }
        ]
      }
    ]
  },
  {
    id: 'medical',
    title: 'Medical Context',
    description: 'Factor in health history for safety.',
    icon: HeartPulse,
    fields: [
      { 
        key: 'diet_type', 
        label: 'Dietary Preference', 
        type: 'select', 
        options: [
          { value: 'vegetarian', label: 'Vegetarian' },
          { value: 'non_veg', label: 'Non-Vegetarian' },
          { value: 'vegan', label: 'Vegan' }
        ]
      }
    ]
  },
  {
    id: 'activity',
    title: 'Activity Level',
    description: 'Current training frequency.',
    icon: Activity,
    fields: [
      { 
        key: 'activity_level', 
        label: 'Weekly Sessions', 
        type: 'select', 
        options: [
          { value: 'sedentary', label: '0-1 sessions (New)' },
          { value: 'moderate', label: '2-4 sessions (Active)' },
          { value: 'heavy', label: '5+ sessions (Pro)' }
        ]
      }
    ]
  },
  {
    id: 'location',
    title: 'Community Sync',
    description: 'Join your local training district.',
    icon: MapPin,
    fields: [
      { key: 'district', label: 'Search District', type: 'searchable' }
    ]
  }
]

const FEMALE_HEALTH_CYCLE_STEP = {
  id: 'women_health_cycle',
  title: "Women's Health: Cycle",
  description: 'Track cycle basics for better recovery and load planning.',
  icon: HeartPulse,
  fields: [
    { key: 'women_health.cycle_length_days', label: 'Cycle Length (days)', type: 'number', placeholder: '28' },
    { key: 'women_health.period_duration_days', label: 'Period Duration (days)', type: 'number', placeholder: '5' },
    { key: 'women_health.last_period_date', label: 'Last Period Date', type: 'date' },
    {
      key: 'women_health.cycle_regularity',
      label: 'Cycle Regularity',
      type: 'select',
      options: [
        { value: 'regular', label: 'Regular' },
        { value: 'irregular', label: 'Irregular' }
      ]
    }
  ]
}

const FEMALE_HEALTH_WELLBEING_STEP = {
  id: 'women_health_wellbeing',
  title: "Women's Health: Wellbeing",
  description: 'Add mood and symptoms so coaching stays realistic and supportive.',
  icon: HeartPulse,
  fields: [
    {
      key: 'women_health.mood_pattern',
      label: 'Behavior Pattern',
      type: 'select',
      options: [
        { value: 'stable', label: 'Stable' },
        { value: 'irritable', label: 'Irritable' },
        { value: 'anxious', label: 'Anxious' },
        { value: 'low_energy', label: 'Low Energy' }
      ]
    },
    { key: 'women_health.symptoms', label: 'Common Symptoms', type: 'textarea', placeholder: 'e.g. cramps, bloating, headache' },
    { key: 'women_health.behavior_notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Anything else to help personalize coaching' }
  ]
}

export default function OnboardingQuiz() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [formData, setFormData] = useState({
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
      symptoms: ''
    }
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [districtSearch, setDistrictSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [indianDistricts, setIndianDistricts] = useState([])
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false)
  const dropdownRef = useRef(null)

  // Fetch Indian Districts dynamically
  useEffect(() => {
    async function loadDistricts() {
      setIsLoadingDistricts(true)
      try {
        // Using a reliable public repository for Indian states and districts
        const response = await fetch('https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/master/states-and-districts.json')
        const data = await response.json()
        
        const flatList = ["Global (International)"]
        data.states.forEach(stateObj => {
          stateObj.districts.forEach(dist => {
            flatList.push(`${dist}, ${stateObj.state}`)
          })
        })
        setIndianDistricts(flatList)
      } catch (error) {
        console.error("Failed to fetch districts", error)
        setIndianDistricts(["Global (International)", "Delhi, India", "Mumbai, India", "Bangalore, India"])
      } finally {
        setIsLoadingDistricts(false)
      }
    }
    loadDistricts()
  }, [])

  const filteredDistricts = useMemo(() => {
    const search = districtSearch.toLowerCase()
    if (!search) return indianDistricts.slice(0, 50) // Show top 50 by default
    return indianDistricts.filter(d => d.toLowerCase().includes(search)).slice(0, 100)
  }, [districtSearch, indianDistricts])

  const steps = useMemo(() => {
    if (formData.gender === 'female') {
      return [
        ...BASE_STEPS.slice(0, 3),
        FEMALE_HEALTH_CYCLE_STEP,
        FEMALE_HEALTH_WELLBEING_STEP,
        ...BASE_STEPS.slice(3)
      ]
    }
    return BASE_STEPS
  }, [formData.gender])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (currentStep >= steps.length) {
      setCurrentStep(Math.max(steps.length - 1, 0))
    }
  }, [currentStep, steps.length])

  const getFieldValue = (key) => {
    if (!key.includes('.')) {
      return formData[key] ?? ''
    }
    const [root, child] = key.split('.')
    return formData[root]?.[child] ?? ''
  }

  const setFieldValue = (key, value) => {
    if (!key.includes('.')) {
      setFormData(prev => ({ ...prev, [key]: value }))
      return
    }
    const [root, child] = key.split('.')
    setFormData(prev => ({
      ...prev,
      [root]: {
        ...(prev[root] || {}),
        [child]: value
      }
    }))
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const payload = {
        ...formData,
        women_health: formData.gender === 'female' ? formData.women_health : undefined
      }
      await updateProfile(payload)
      setIsFinished(true)
      document.body.classList.add('success-mode-active')
      setTimeout(() => {
        document.body.classList.remove('success-mode-active')
        navigate('/dashboard')
      }, 1500)
    } catch (error) {
      setIsSubmitting(false)
    }
  }

  const step = steps[currentStep]
  const Icon = step.icon
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      
      <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: -1, display: 'flex' }}>
        <div style={{ width: '240px', borderRight: '1px solid var(--border)', padding: '2rem', filter: 'blur(8px)', opacity: 0.4 }}>
           <div style={{ width: '100px', height: '24px', background: 'var(--accent)', borderRadius: '2px', marginBottom: '3rem' }} />
           {[1,2,3,4,5,6].map(i => (
             <div key={i} style={{ width: '100%', height: '32px', background: 'var(--surface-hover)', borderRadius: '2px', marginBottom: '1rem' }} />
           ))}
        </div>
        <div style={{ flex: 1, padding: '2rem', filter: 'blur(12px)', opacity: 0.3 }}>
           <div style={{ height: '40px', width: '200px', background: 'var(--accent)', borderRadius: '2px', marginBottom: '2rem' }} />
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
              {[1,2,3,4].map(i => <div key={i} style={{ height: '120px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px' }} />)}
           </div>
           <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
              <div style={{ height: '400px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px' }} />
              <div style={{ height: '400px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px' }} />
           </div>
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,5,0.6)', backdropFilter: 'blur(4px)' }} />
      </div>

      <AnimatePresence mode="wait">
        {!isFinished && (
          <motion.div 
            key="rounded-cool-box"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(30px)', transition: { duration: 0.8 } }}
            style={{ 
              maxWidth: '460px', 
              width: '90%',
              maxHeight: '88vh',
              overflow: 'auto',
              background: 'rgba(15, 15, 15, 0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '24px',
              padding: '3.5rem',
              position: 'relative',
              boxShadow: '0 40px 100px rgba(0,0,0,0.8)'
            }}
          >
            <div style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', padding: '8px 24px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10, boxShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
               <Dumbbell size={14} style={{ color: 'var(--bg)' }} strokeWidth={3} />
               <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--bg)' }}>ARIZE Protocol</span>
            </div>

            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Phase {currentStep + 1} / {steps.length}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)' }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px', width: '100%' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  style={{ height: '100%', background: 'var(--accent)', boxShadow: '0 0 15px var(--accent)', borderRadius: '1px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ color: 'var(--accent)', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Icon size={28} strokeWidth={1.5} />
                </div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>{step.title}</h1>
              </div>
              <p style={{ fontSize: '0.935rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{step.description}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                >
                  {step.fields.map(field => (
                    <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>{field.label}</label>
                      
                      {field.type === 'searchable' ? (
                        <div style={{ position: 'relative' }} ref={dropdownRef}>
                          <div 
                            onClick={() => setShowDropdown(!showDropdown)}
                            style={{ 
                              height: '3.5rem', 
                              background: 'rgba(255,255,255,0.03)', 
                              border: '1px solid rgba(255,255,255,0.1)', 
                              color: '#fff', 
                              fontSize: '1rem', 
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0 1rem',
                              justifyContent: 'space-between',
                              cursor: 'pointer'
                            }}
                          >
                            <span>{formData.district}</span>
                            <Search size={18} opacity={0.5} />
                          </div>
                          
                          <AnimatePresence>
                            {showDropdown && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                style={{ 
                                  position: 'absolute', 
                                  bottom: '4rem', 
                                  left: 0, 
                                  right: 0, 
                                  background: '#0a0a0a', 
                                  border: '1px solid rgba(255,255,255,0.1)', 
                                  borderRadius: '12px',
                                  maxHeight: '250px',
                                  overflowY: 'auto',
                                  zIndex: 100,
                                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                  padding: '0.5rem'
                                }}
                              >
                                <input 
                                  autoFocus
                                  placeholder="Type to filter districts..."
                                  value={districtSearch}
                                  onChange={e => setDistrictSearch(e.target.value)}
                                  style={{ 
                                    width: '100%', 
                                    background: 'rgba(255,255,255,0.05)', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    padding: '0.75rem', 
                                    color: '#fff', 
                                    borderRadius: '8px',
                                    marginBottom: '0.5rem',
                                    fontSize: '0.875rem'
                                  }}
                                />
                                {isLoadingDistricts ? (
                                  <div style={{ padding: '2rem', textAlign: 'center' }}>
                                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Syncing Indian Districts...</span>
                                  </div>
                                ) : (
                                  filteredDistricts.map(d => (
                                    <div 
                                      key={d}
                                      onClick={() => {
                                        setFieldValue('district', d);
                                        setShowDropdown(false);
                                        setDistrictSearch('');
                                      }}
                                      style={{ 
                                        padding: '0.75rem 1rem', 
                                        borderRadius: '8px', 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: formData.district === d ? 'rgba(255,255,255,0.05)' : 'transparent',
                                        fontSize: '0.875rem'
                                      }}
                                      onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                      onMouseLeave={e => e.target.style.background = formData.district === d ? 'rgba(255,255,255,0.05)' : 'transparent'}
                                    >
                                      {d}
                                      {formData.district === d && <Check size={14} color="var(--accent)" />}
                                    </div>
                                  ))
                                )}
                                {!isLoadingDistricts && filteredDistricts.length === 0 && (
                                  <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', opacity: 0.5 }}>No districts found.</div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : field.type === 'select' ? (
                        <select
                          className="auth-input"
                          value={getFieldValue(field.key)}
                          onChange={e => setFieldValue(field.key, e.target.value)}
                          style={{ height: '3.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '1rem', borderRadius: '12px' }}
                        >
                          {field.options.map(opt => (
                            <option key={opt.value} value={opt.value} style={{ background: '#000' }}>{opt.label}</option>
                          ))}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          className="auth-input"
                          placeholder={field.placeholder}
                          value={getFieldValue(field.key)}
                          onChange={e => setFieldValue(field.key, e.target.value)}
                          rows={3}
                          style={{ minHeight: '5.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem', borderRadius: '12px', padding: '0.75rem' }}
                        />
                      ) : (
                        <input
                          type={field.type}
                          className="auth-input"
                          placeholder={field.placeholder}
                          value={getFieldValue(field.key)}
                          onChange={e => setFieldValue(field.key, e.target.value)}
                          style={{ height: '3.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '1rem', borderRadius: '12px' }}
                        />
                      )}
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                {currentStep > 0 && (
                  <button 
                    onClick={handleBack}
                    className="btn-secondary"
                    style={{ 
                      flex: 1,
                      height: '4rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.75rem',
                      fontSize: '1rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <ChevronLeft size={20} />
                    Back
                  </button>
                )}
                
                <button 
                  onClick={handleNext} 
                  disabled={isSubmitting}
                  className="btn-primary" 
                  style={{ 
                    flex: 2,
                    height: '4rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '1rem',
                    fontSize: '1rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRadius: '12px'
                  }}
                >
                  {isSubmitting ? 'Optimizing...' : (currentStep === steps.length - 1 ? 'Complete Setup' : 'Next Phase')}
                  {!isSubmitting && <ChevronRight size={20} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10001, color: '#fff' }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              <Zap size={100} style={{ color: '#4ade80', marginBottom: '2.5rem', filter: 'drop-shadow(0 0 20px #4ade80)' }} strokeWidth={2.5} />
            </motion.div>
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{ fontSize: '3rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.06em' }}
            >
              Access Granted
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.5 }}
              style={{ marginTop: '1.5rem', fontSize: '1.25rem', fontWeight: 500, letterSpacing: '0.05em' }}
            >
              System fully optimized for your profile.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
