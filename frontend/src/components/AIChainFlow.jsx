import { motion } from 'framer-motion'
import { ArrowRight, Terminal, Cpu, Video, BarChart2, Lightbulb, CheckCircle } from 'lucide-react'

const nodes = [
  { id: 'input', label: 'User Input', icon: Terminal },
  { id: 'process', label: 'AI Processing', icon: Cpu },
  { id: 'cv', label: 'CV Model', icon: Video },
  { id: 'analysis', label: 'Data Analysis', icon: BarChart2 },
  { id: 'recommend', label: 'Recommendation', icon: Lightbulb },
  { id: 'output', label: 'Output', icon: CheckCircle },
]

export default function AIChainFlow() {
  return (
    <div className="ai-chain-flow" style={{ padding: '2rem 0', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 'max-content' }}>
        {nodes.map((node, index) => {
          const Icon = node.icon
          return (
            <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  padding: '1rem',
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  minWidth: '120px'
                }}
              >
                <Icon size={20} className="text-muted" />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {node.label}
                </span>
              </motion.div>
              {index < nodes.length - 1 && (
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ArrowRight size={16} className="text-muted" />
                </motion.div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
