import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Dumbbell, Heart, Wind, Zap } from 'lucide-react'
import './GymMascot.css'

const MODES = {
  standard: { name: 'Standard', className: '', color: 'var(--gold)', icon: Dumbbell, message: 'Ready for your session, champ?' },
  beast: { name: 'Beast', className: 'beast-mode-active', color: '#ff5c6c', icon: Zap, message: 'BEAST MODE ACTIVATED! 💪' },
  zen: { name: 'Zen', className: 'zen-mode-active', color: '#4cc9f0', icon: Wind, message: 'Focus on your breath. Be present.' },
  recovery: { name: 'Recovery', className: 'recovery-mode-active', color: '#3ddc84', icon: Heart, message: 'Rest is where the growth happens.' },
}

const MODE_KEYS = Object.keys(MODES)

const MOTIVATIONS = [
  'One more rep, you got this!',
  'Consistency is key!',
  'Form looks solid today.',
  "Don't forget to hydrate!",
  'Your future self will thank you.',
  'Crushing those goals!',
  'The grind never stops.',
]

// Floating coach: tap to cycle Beast / Zen / Recovery modes, which tint the whole app.
export default function GymMascot() {
  const [mode, setMode] = useState('standard')
  const [message, setMessage] = useState(MODES.standard.message)
  const [showBubble, setShowBubble] = useState(true)

  useEffect(() => {
    if (mode !== 'standard') return undefined
    const interval = setInterval(() => {
      setMessage(MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)])
      setShowBubble(true)
    }, 20000)
    return () => clearInterval(interval)
  }, [mode])

  useEffect(() => {
    if (!showBubble) return undefined
    const timeout = setTimeout(() => setShowBubble(false), 6000)
    return () => clearTimeout(timeout)
  }, [showBubble, message])

  useEffect(() => {
    const className = MODES[mode].className
    if (className) document.body.classList.add(className)
    return () => {
      if (className) document.body.classList.remove(className)
    }
  }, [mode])

  const cycleMode = () => {
    const next = MODE_KEYS[(MODE_KEYS.indexOf(mode) + 1) % MODE_KEYS.length]
    setMode(next)
    setMessage(MODES[next].message)
    setShowBubble(true)
  }

  const config = MODES[mode]
  const Icon = config.icon

  return (
    <div className="mascot" style={{ '--mascot-color': config.color }}>
      <AnimatePresence>
        {showBubble && (
          <motion.button
            type="button"
            className="mascot__bubble"
            onClick={() => setShowBubble(false)}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
          >
            {message}
          </motion.button>
        )}
      </AnimatePresence>
      <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
        {mode !== 'standard' && <span className="badge mascot__mode">{config.name} mode</span>}
        <motion.button
          type="button"
          className="mascot__button"
          onClick={cycleMode}
          aria-label={`Coach mode: ${config.name}. Tap to switch mode.`}
          whileTap={{ scale: 0.9 }}
          animate={mode === 'standard' ? { y: [0, -4, 0] } : { rotate: [0, -6, 6, 0] }}
          transition={{ duration: mode === 'beast' ? 0.5 : 3.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon size={26} strokeWidth={2.6} />
        </motion.button>
      </div>
    </div>
  )
}
