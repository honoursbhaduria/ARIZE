import { Link } from '@tanstack/react-router'
import { Scale } from 'lucide-react'
import { BMI_BANDS, BMI_CATEGORIES, BMI_SCALE_MAX, BMI_SCALE_MIN, bmiScalePct, computeBmi, getBmiCategory } from '../lib/health'
import { Card, CardHeader } from '../ui/components'
import './BmiCard.css'

const span = BMI_SCALE_MAX - BMI_SCALE_MIN
const pctOf = (value) => ((value - BMI_SCALE_MIN) / span) * 100
const colorOf = (label) => BMI_CATEGORIES.find((c) => c.label === label).color

function BmiScale({ bmi, category }) {
  const marker = bmiScalePct(bmi)
  return (
    <div className="bmi-scale" role="img" aria-label={`BMI ${bmi}, ${category.label}`}>
      <div className="bmi-scale__marker" style={{ left: `${marker}%`, '--marker-color': category.color }}>
        <span className="bmi-scale__value">{bmi}</span>
      </div>
      <div className="bmi-scale__track">
        {BMI_BANDS.map((band) => (
          <span
            key={band.label}
            className={`bmi-scale__band ${band.label === category.label ? 'is-active' : ''}`}
            style={{ flexBasis: `${((band.end - band.start) / span) * 100}%`, '--band-color': colorOf(band.label) }}
          />
        ))}
      </div>
      <div className="bmi-scale__ticks" aria-hidden="true">
        {[18.5, 25, 30].map((tick) => (
          <span key={tick} style={{ left: `${pctOf(tick)}%` }}>{tick}</span>
        ))}
      </div>
    </div>
  )
}

export default function BmiCard({ weight, height, showCategories = false }) {
  const bmi = computeBmi(weight, height)
  const category = getBmiCategory(bmi)

  return (
    <Card>
      <CardHeader icon={Scale} tone="blue" title="Your BMI" />
      {bmi ? (
        <div className="stack">
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="mono" style={{ fontSize: '2.6rem', fontWeight: 700, color: category.color, lineHeight: 1 }}>{bmi}</span>
            <span style={{ fontWeight: 700, color: category.color }}>{category.label}</span>
          </div>
          <BmiScale bmi={bmi} category={category} />
          {showCategories && (
            <div className="grid-2" style={{ gap: 8, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {BMI_CATEGORIES.map((cat) => (
                <div
                  key={cat.label}
                  className="list-row"
                  style={{ padding: '8px 10px', flexDirection: 'column', alignItems: 'flex-start', gap: 0, borderColor: cat.label === category.label ? cat.color : undefined }}
                >
                  <span className="tiny" style={{ fontWeight: 700, color: cat.color }}>{cat.label}</span>
                  <span className="tiny dim">{cat.range}</span>
                </div>
              ))}
            </div>
          )}
          <p className="tiny dim">
            {weight} kg · {height ? `${height} cm` : 'assumed 170 cm'}
            {!height && <> · <Link to="/settings" className="link tiny">add your height</Link></>}
          </p>
        </div>
      ) : (
        <div className="stack-sm">
          <p className="muted small">Add your weight and height to see your BMI.</p>
          <Link to="/settings" className="link small">Update profile →</Link>
        </div>
      )}
    </Card>
  )
}
