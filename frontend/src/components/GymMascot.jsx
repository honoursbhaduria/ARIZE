import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, Trophy, Zap, Heart, MessageSquare, Wind, Sparkles } from 'lucide-react'

const MODES = {
  standard: {
    name: 'Standard',
    class: '',
    color: 'var(--accent)',
    icon: Dumbbell,
    message: "Ready for your session, champ?",
    bubble: 'var(--surface)'
  },
  beast: {
    name: 'Beast',
    class: 'beast-mode-active',
    color: '#ff3e3e',
    icon: Zap,
    message: "BEAST MODE ACTIVATED! 💪",
    bubble: '#ff3e3e'
  },
  zen: {
    name: 'Zen',
    class: 'zen-mode-active',
    color: '#3ecfff',
    icon: Wind,
    message: "Focus on your breath. Be present.",
    bubble: '#3ecfff'
  },
  recovery: {
    name: 'Recovery',
    class: 'recovery-mode-active',
    color: '#4ade80',
    icon: Heart,
    message: "Rest is where the growth happens.",
    bubble: '#4ade80'
  }
}

const MOTIVATIONS = [
  "One more rep, you got this!",
  "Consistency is key!",
  "Form looks solid today.",
  "Don't forget to hydrate!",
  "Your future self will thank you.",
  "Crushing those goals!",
  "The grind never stops."
]

export default function GymMascot() {
  const [currentMode, setCurrentMode] = useState('standard')
  const [message, setMessage] = useState(MODES.standard.message)
  const [showBubble, setShowBubble] = useState(true)

  const modeKeys = Object.keys(MODES)

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentMode === 'standard') {
        const nextMsg = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]
        setMessage(nextMsg)
        setShowBubble(true)
      }
    }, 20000)
    return () => clearInterval(interval)
  }, [currentMode])

  const handleMascotClick = () => {
    const currentIndex = modeKeys.indexOf(currentMode)
    const nextIndex = (currentIndex + 1) % modeKeys.length
    const nextModeKey = modeKeys[nextIndex]
    const nextMode = MODES[nextModeKey]

    // Remove all mode classes
    modeKeys.forEach(k => {
      if (MODES[k].class) document.body.classList.remove(MODES[k].class)
    })

    // Set new state
    setCurrentMode(nextModeKey)
    setMessage(nextMode.message)
    setShowBubble(true)
    
    // Add new class if applicable
    if (nextMode.class) {
      document.body.classList.add(nextMode.class)
    }
  }

  const ModeConfig = MODES[currentMode]
  const Icon = ModeConfig.icon

  return (
    <div
      className="gym-mascot-root"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'none'
      }}
    >
      <AnimatePresence>
        {showBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10, x: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10, x: 10 }}
            style={{
              background: ModeConfig.bubble,
              border: `1px solid ${ModeConfig.color}`,
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '0.815rem',
              fontWeight: 700,
              marginBottom: '12px',
              color: currentMode === 'standard' ? 'var(--text-primary)' : '#ffffff',
              boxShadow: currentMode === 'standard' ? '0 8px 24px rgba(0,0,0,0.4)' : `0 0 20px ${ModeConfig.color}44`,
              position: 'relative',
              maxWidth: '200px',
              pointerEvents: 'auto',
              cursor: 'pointer'
            }}
            onClick={() => setShowBubble(false)}
          >
            {message}
            <div style={{
              position: 'absolute',
              bottom: '-6px',
              right: '20px',
              width: '12px',
              height: '12px',
              background: ModeConfig.bubble,
              borderRight: currentMode === 'standard' ? '1px solid var(--border)' : 'none',
              borderBottom: currentMode === 'standard' ? '1px solid var(--border)' : 'none',
              transform: 'rotate(45deg)'
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <AnimatePresence>
          {currentMode !== 'standard' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                padding: '4px 12px',
                borderRadius: '99px',
                fontSize: '0.65rem',
                fontWeight: 800,
                color: ModeConfig.color,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              {ModeConfig.name} Mode
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          onClick={handleMascotClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={currentMode !== 'standard' ? {
            rotate: [0, -5, 5, 0],
            scale: [1, 1.05, 1]
          } : {
            y: [0, -5, 0]
          }}
          transition={{ duration: currentMode === 'beast' ? 0.5 : 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: '56px',
            height: '56px',
            background: ModeConfig.color,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: currentMode === 'standard' ? 'var(--bg)' : '#ffffff',
            cursor: 'pointer',
            pointerEvents: 'auto',
            boxShadow: currentMode !== 'standard' ? `0 0 30px ${ModeConfig.color}66` : 'none',
            transition: 'all 0.3s ease'
          }}
        >
          <Icon size={32} strokeWidth={3} />
        </motion.div>
      </div>
    </div>
  )
}
