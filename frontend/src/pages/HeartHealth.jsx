import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { HeartPulse, ShieldAlert, Activity } from 'lucide-react'
import { predictHeartHealth } from '../services/api'

const FIELD_CONFIG = [
  { key: 'Gender', label: 'Gender', options: ['Male', 'Female'] },
  { key: 'Age', label: 'Age Group', options: ['18-34', '35-50', '51-64', '65+'] },
  { key: 'History', label: 'Hypertension History', options: ['No', 'Yes'] },
  { key: 'Patient', label: 'Currently Diagnosed Patient', options: ['No', 'Yes'] },
  { key: 'TakeMedication', label: 'Taking Medication', options: ['No', 'Yes'] },
  { key: 'Severity', label: 'Current Severity', options: ['Mild', 'Moderate', 'Sever'] },
  { key: 'BreathShortness', label: 'Shortness of Breath', options: ['No', 'Yes'] },
  { key: 'VisualChanges', label: 'Visual Changes', options: ['No', 'Yes'] },
  { key: 'NoseBleeding', label: 'Nose Bleeding', options: ['No', 'Yes'] },
  { key: 'Whendiagnoused', label: 'When Diagnosed', options: ['<1 Year', '1 - 5 Years', '>5 Years'] },
  { key: 'Systolic', label: 'Systolic Range', options: ['100 - 110', '111 - 120', '121 - 130', '130+'] },
  { key: 'Diastolic', label: 'Diastolic Range', options: ['70 - 80', '81 - 90', '91 - 100', '100+'] },
  { key: 'ControlledDiet', label: 'Following Controlled Diet', options: ['No', 'Yes'] },
]

const INITIAL_FORM = {
  Gender: 'Male',
  Age: '35-50',
  History: 'No',
  Patient: 'No',
  TakeMedication: 'No',
  Severity: 'Mild',
  BreathShortness: 'No',
  VisualChanges: 'No',
  NoseBleeding: 'No',
  Whendiagnoused: '<1 Year',
  Systolic: '111 - 120',
  Diastolic: '81 - 90',
  ControlledDiet: 'Yes',
}

export default function HeartHealth() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const groupedFields = useMemo(() => {
    return {
      basics: FIELD_CONFIG.slice(0, 6),
      symptoms: FIELD_CONFIG.slice(6, 10),
      pressure: FIELD_CONFIG.slice(10, 13),
    }
  }, [])

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handlePredict = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const response = await predictHeartHealth(form)
      setResult(response)
    } catch (err) {
      setError(err.message || 'Unable to run heart health prediction right now.')
    } finally {
      setLoading(false)
    }
  }

  const renderFieldBlock = (title, icon, fields) => (
    <div className="card" style={{ gridColumn: 'span 4' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        {icon}
        <h3 style={{ fontSize: '1rem' }}>{title}</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {fields.map((field) => (
          <div key={field.key}>
            <label className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem', display: 'block' }}>
              {field.label}
            </label>
            <select
              value={form[field.key]}
              onChange={(e) => handleChange(field.key, e.target.value)}
              style={{ width: '100%', background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '0.65rem', color: 'var(--text-primary)', borderRadius: 'var(--radius)' }}
            >
              {field.options.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <motion.div
      className="grid-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: '100%',
        backgroundImage: "linear-gradient(145deg, rgba(5,5,5,0.88), rgba(5,5,5,0.72)), url('/image.png')",
        backgroundSize: 'cover, cover',
        backgroundPosition: 'center, center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#050505',
      }}
    >
      <div style={{ gridColumn: 'span 12', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>AI Heart Health Measure</h1>
        <p className="text-muted">Assess hypertension risk stage with medical-style guidance and action recommendations.</p>
      </div>

      <form onSubmit={handlePredict} style={{ display: 'contents' }}>
        {renderFieldBlock('Patient Basics', <HeartPulse size={18} />, groupedFields.basics)}
        {renderFieldBlock('Symptoms & Signals', <ShieldAlert size={18} />, groupedFields.symptoms)}
        {renderFieldBlock('Blood Pressure & Diet', <Activity size={18} />, groupedFields.pressure)}

        <div style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button className="btn-primary" type="submit" disabled={loading} style={{ minWidth: '220px' }}>
            {loading ? 'Analyzing...' : 'Predict Heart Health'}
          </button>
        </div>
      </form>

      {error && (
        <div className="card" style={{ gridColumn: 'span 12', borderColor: 'rgba(239,68,68,0.4)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="card" style={{ gridColumn: 'span 12', borderColor: `${result.color}66` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div>
              <div className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Predicted Stage</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: result.color }}>{result.stage}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Confidence</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{result.confidence}%</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Priority</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: result.color }}>{result.recommendation?.priority}</div>
            </div>
          </div>

          <div style={{ marginBottom: '0.9rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>{result.recommendation?.title}</div>
            <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{result.recommendation?.description}</p>
          </div>

          <div>
            <div className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>Recommended Actions</div>
            <ul style={{ marginLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {(result.recommendation?.actions || []).map((action, index) => (
                <li key={`${action}-${index}`} style={{ fontSize: '0.9rem' }}>{action}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </motion.div>
  )
}
