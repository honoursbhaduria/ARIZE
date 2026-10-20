import { useCallback, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Star } from 'lucide-react'
import { ToastContext } from './toast-context'

const ICONS = { success: CheckCircle2, error: AlertCircle, xp: Star }

export function Toaster({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const push = useCallback(({ tone, message }) => {
    idRef.current += 1
    const id = idRef.current
    setToasts((current) => [...current.slice(-2), { id, tone, message }])
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3200)
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = ICONS[toast.tone] || CheckCircle2
            return (
              <motion.div
                key={toast.id}
                className={`toast toast--${toast.tone}`}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
              >
                <Icon size={18} />
                <span>{toast.message}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
