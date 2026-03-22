import { motion } from 'framer-motion'
import './AIPipeline.css'

const steps = [
  'User Input',
  'AI Processing',
  'CV Model',
  'Data Analysis',
  'Recommendation',
  'Output',
]

export default function AIPipeline() {
  return (
    <section className="ai-pipeline-card" aria-label="AI processing pipeline">
      <div className="ai-pipeline-head">
        <h3>AI Chain</h3>
        <small>Input to outcome flow</small>
      </div>
      <motion.div className="ai-pipeline-track" drag="x" dragConstraints={{ left: -120, right: 120 }}>
        {steps.map((step, index) => (
          <div className="pipeline-segment" key={step}>
            <div className="pipeline-node">{step}</div>
            {index < steps.length - 1 ? (
              <div className="pipeline-connector" aria-hidden="true">
                <span className="flow-dot" />
              </div>
            ) : null}
          </div>
        ))}
      </motion.div>
    </section>
  )
}
