import { createContext, useContext } from 'react'

// Shared music state so playback survives page changes (see MusicProvider).
export const MusicContext = createContext(null)

export function useMusic() {
  const value = useContext(MusicContext)
  if (!value) throw new Error('useMusic must be used inside <MusicProvider>')
  return value
}
