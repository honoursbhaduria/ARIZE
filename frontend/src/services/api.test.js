import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../utils/supabase/client', () => ({ supabase: null }))

const api = await import('./api')

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('auth session', () => {
  it('stores tokens and user after login', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200, { user: { id: 1, username: 'ana' }, tokens: { access: 'A', refresh: 'R' } }))
    await api.loginUser({ username: 'ana', password: 'pw' })
    expect(api.isAuthenticated()).toBe(true)
    expect(api.getCurrentUser()).toEqual({ id: 1, username: 'ana' })
  })

  it('clears everything on logout', () => {
    localStorage.setItem('bt_access_token', 'A')
    localStorage.setItem('bt_user', '{"username":"ana"}')
    api.clearAuthSession()
    expect(api.isAuthenticated()).toBe(false)
    expect(api.getCurrentUser()).toBeNull()
  })
})

describe('request', () => {
  it('sends the bearer token', async () => {
    localStorage.setItem('bt_access_token', 'A')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200, { age: 30 }))
    await expect(api.fetchProfile()).resolves.toEqual({ age: 30 })
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer A')
  })

  it('refreshes an expired token once and retries', async () => {
    localStorage.setItem('bt_access_token', 'OLD')
    localStorage.setItem('bt_refresh_token', 'R')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(401, { detail: 'expired' }))
      .mockResolvedValueOnce(json(200, { access: 'NEW' }))
      .mockResolvedValueOnce(json(200, { ok: true }))
    await expect(api.fetchProfile()).resolves.toEqual({ ok: true })
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer NEW')
    expect(localStorage.getItem('bt_access_token')).toBe('NEW')
  })

  it('logs the user out when the refresh token is rejected', async () => {
    localStorage.setItem('bt_access_token', 'OLD')
    localStorage.setItem('bt_refresh_token', 'R')
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(401, { detail: 'Token expired' }))
      .mockResolvedValueOnce(json(401, { detail: 'bad refresh' }))
    await expect(api.fetchProfile()).rejects.toThrow('Token expired')
    expect(api.isAuthenticated()).toBe(false)
  })

  it('surfaces the first field error from DRF validation responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(400, { username: ['A user with that username already exists.'] }))
    await expect(api.registerUser({ username: 'x' })).rejects.toThrow('A user with that username already exists.')
  })

  it('explains network failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(api.fetchProfile()).rejects.toThrow(/Unable to connect to server/)
  })
})

describe('supabase helpers without configuration', () => {
  it('fail with a clear message instead of crashing', async () => {
    await expect(api.supabaseLogin({ email: 'a@b.c', password: 'x' })).rejects.toThrow('Supabase sign-in is not configured.')
    await expect(api.completeSupabaseRedirect()).resolves.toBeNull()
  })
})
