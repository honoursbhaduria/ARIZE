import { Link } from '@tanstack/react-router'
import { Scale } from 'lucide-react'
import { BMI_CATEGORIES, bmiScalePct, computeBmi, getBmiCategory } from '../lib/health'
import { Card, CardHeader } from '../ui/components'

const SCALE_GRADIENT = 'linear-gradient(90deg, #4cc9f0 0%, #3ddc84 28%, #3ddc84 50%, #ff9f43 50%, #ff9f43 67%, #ff5c6c 67%)'

export default function BmiCard({ weight, showCategories = false }) {
  const bmi = computeBmi(weight)
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
          <div>
            <div style={{ position: 'relative', height: 10, borderRadius: 999, background: SCALE_GRADIENT }}>
              <span
                style={{
                  position: 'absolute', top: -4, left: `${bmiScalePct(bmi)}%`,
                  width: 18, height: 18, borderRadius: '50%',
                  background: category.color, border: '3px solid var(--bg)',
                  transform: 'translateX(-50%)', transition: 'left 0.5s var(--ease)',
                }}
              />
            </div>
            <div className="spread tiny dim mono" style={{ marginTop: 6 }}>
              <span>10</span><span>18.5</span><span>25</span><span>30</span><span>40+</span>
            </div>
          </div>
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
          <p className="tiny dim">Based on {weight} kg · assumed height 170 cm</p>
        </div>
      ) : (
        <div className="stack-sm">
          <p className="muted small">Add your weight to see your BMI.</p>
          <Link to="/settings" className="link small">Update profile →</Link>
        </div>
      )}
    </Card>
  )
}
