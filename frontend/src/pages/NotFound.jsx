import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div 
      className="auth-page-root" 
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: '400px' }}
      >
        <div style={{ display: 'inline-flex', padding: '1.5rem', background: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
           <AlertTriangle size={48} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
        </div>
        
        <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.05em' }}>404</h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>Route Not Found</h2>
        <p className="text-muted" style={{ marginBottom: '2.5rem', lineHeight: 1.6 }}>
          The coordinates you've entered do not exist within the ARIZE ecosystem.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           <Link to="/dashboard" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', height: '3.5rem', borderRadius: '12px' }}>
              <Home size={18} /> Return to Hub
           </Link>
           <button 
             onClick={() => window.history.back()} 
             className="btn-secondary" 
             style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', height: '3.5rem', borderRadius: '12px' }}
           >
              <ArrowLeft size={18} /> Go Back
           </button>
        </div>
      </motion.div>
    </div>
  )
}
