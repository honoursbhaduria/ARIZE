import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from '@tanstack/react-router'

vi.mock('./utils/supabase/client', () => ({ supabase: null }))

const { createAppRouter } = await import('./router')

async function loadAt(path) {
  const router = createAppRouter({ history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  return { ...router.state.location, matchSearch: router.state.matches.at(-1)?.search }
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
})

describe('route guards', () => {
  it('sends signed-out visitors from app pages to login, remembering where they were going', async () => {
    const location = await loadAt('/settings')
    expect(location.pathname).toBe('/login')
    expect(location.search.redirect).toBe('/settings')
  })

  it('protects onboarding too', async () => {
    expect((await loadAt('/onboarding')).pathname).toBe('/login')
  })

  it('lets signed-in users into the app', async () => {
    localStorage.setItem('bt_access_token', 'token')
    expect((await loadAt('/dashboard')).pathname).toBe('/dashboard')
  })

  it('skips login and register for signed-in users', async () => {
    localStorage.setItem('bt_access_token', 'token')
    expect((await loadAt('/login')).pathname).toBe('/dashboard')
    expect((await loadAt('/register')).pathname).toBe('/dashboard')
  })

  it('keeps the landing page public', async () => {
    expect((await loadAt('/')).pathname).toBe('/')
  })

  it('defaults the posture topic', async () => {
    localStorage.setItem('bt_access_token', 'token')
    expect((await loadAt('/posture-reading')).matchSearch.topic).toBe('Squat')
  })
})
