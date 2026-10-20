import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, HeartPulse, ShieldAlert, Stethoscope } from 'lucide-react'
import { predictHeartHealth } from '../services/api'
import { Alert, Badge, Button, Card, CardHeader, PageHeader } from '../ui/components'

const FIELD_CONFIG = [
  { key: 'Gender', label: 'Gender', options: ['Male', 'Female'] },
  { key: 'Age', label: 'Age group', options: ['18-34', '35-50', '51-64', '65+'] },
  { key: 'History', label: 'Hypertension history', options: ['No', 'Yes'] },
  { key: 'Patient', label: 'Currently diagnosed patient', options: ['No', 'Yes'] },
  { key: 'TakeMedication', label: 'Taking medication', options: ['No', 'Yes'] },
  // "Sever" is the value the prediction model was trained on.
  { key: 'Severity', label: 'Current severity', options: ['Mild', 'Moderate', 'Sever'], labels: { Sever: 'Severe' } },
  { key: 'BreathShortness', label: 'Shortness of breath', options: ['No', 'Yes'] },
  { key: 'VisualChanges', label: 'Visual changes', options: ['No', 'Yes'] },
  { key: 'NoseBleeding', label: 'Nose bleeding', options: ['No', 'Yes'] },
  { key: 'Whendiagnoused', label: 'When diagnosed', options: ['<1 Year', '1 - 5 Years', '>5 Years'] },
  { key: 'Systolic', label: 'Systolic range', options: ['100 - 110', '111 - 120', '121 - 130', '130+'] },
  { key: 'Diastolic', label: 'Diastolic range', options: ['70 - 80', '81 - 90', '91 - 100', '100+'] },
  { key: 'ControlledDiet', label: 'Following controlled diet', options: ['No', 'Yes'] },
]

const GROUPS = [
  { title: 'Patient basics', icon: HeartPulse, tone: 'red', fields: FIELD_CONFIG.slice(0, 6) },
  { title: 'Symptoms & signals', icon: ShieldAlert, tone: 'orange', fields: FIELD_CONFIG.slice(6, 10) },
  { title: 'Blood pressure & diet', icon: Activity, tone: 'blue', fields: FIELD_CONFIG.slice(10, 13) },
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

function OptionChips({ field, value, onChange }) {
  return (
    <div className="field">
      <span className="label" id={`hh-${field.key}`}>{field.label}</span>
      <div className="row-wrap" role="radiogroup" aria-labelledby={`hh-${field.key}`} style={{ gap: 8 }}>
        {field.options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            className={`chip ${value === option ? 'chip--active' : ''}`}
            onClick={() => onChange(option)}
          >
            {field.labels?.[option] || option}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function HeartHealth() {
  const [form, setForm] = useState(INITIAL_FORM)
  const prediction = useMutation({ mutationFn: predictHeartHealth })
  const result = prediction.data

  const submit = (event) => {
    event.preventDefault()
    prediction.mutate(form, {
      onSuccess: () => setTimeout(() => document.getElementById('hh-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50),
    })
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Health check" title="Heart Health" subtitle="Estimate your hypertension stage and get guided next steps. Educational only, not a diagnosis." />

      <form onSubmit={submit} className="stack">
        <div className="grid-3">
          {GROUPS.map((group) => (
            <Card key={group.title}>
              <CardHeader icon={group.icon} tone={group.tone} title={group.title} />
              <div className="stack">
                {group.fields.map((field) => (
                  <OptionChips key={field.key} field={field} value={form[field.key]} onChange={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))} />
                ))}
              </div>
            </Card>
          ))}
        </div>

        {prediction.isError && <Alert tone="error">{prediction.error?.message || 'Unable to run heart health prediction right now.'}</Alert>}

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button type="submit" variant="primary" size="lg" icon={Stethoscope} loading={prediction.isPending} className="grow" style={{ maxWidth: 360 }}>
            Predict heart health
          </Button>
        </div>
      </form>

      {result && (
        <motion.div id="hh-result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card style={{ borderColor: result.color }}>
            <div className="grid-3" style={{ marginBottom: 18 }}>
              <div className="stat">
                <span className="stat__label">Predicted stage</span>
                <span className="stat__value" style={{ color: result.color, fontFamily: 'var(--font-display)' }}>{result.stage}</span>
              </div>
              <div className="stat">
                <span className="stat__label">Confidence</span>
                <span className="stat__value">{result.confidence}%</span>
              </div>
              <div className="stat">
                <span className="stat__label">Priority</span>
                <span><Badge tone="gold">{result.recommendation?.priority}</Badge></span>
              </div>
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: 6 }}>{result.recommendation?.title}</h3>
            <p className="muted" style={{ marginBottom: 14 }}>{result.recommendation?.description}</p>
            <span className="eyebrow">Recommended actions</span>
            <ul className="list" style={{ marginTop: 10 }}>
              {(result.recommendation?.actions || []).map((action, index) => (
                <li key={`${action}-${index}`} className="list-row small">
                  <span className="mono gold" style={{ fontWeight: 700 }}>{index + 1}</span>
                  {action}
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
