import { createContext, useContext } from 'react'

export const ToastContext = createContext({ push: () => {} })

// toast.success('Saved'), toast.error('Nope'), toast.xp('+50 XP')
export function useToast() {
  const { push } = useContext(ToastContext)
  return {
    success: (message) => push({ tone: 'success', message }),
    error: (message) => push({ tone: 'error', message }),
    xp: (message) => push({ tone: 'xp', message }),
  }
}
