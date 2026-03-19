import { motion } from 'framer-motion'
import './Background.css'

export default function Background() {
  return (
    <div className="bg-container">
      <motion.div 
        className="glow-blob blob-1"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      <motion.div 
        className="glow-blob blob-2"
        animate={{
          scale: [1.2, 1, 1.2],
          x: [0, -80, 0],
          y: [0, -100, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      <div className="grid-overlay" />
    </div>
  )
}
