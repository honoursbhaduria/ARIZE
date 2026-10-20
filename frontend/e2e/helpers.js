import { expect } from '@playwright/test'

export const API = 'http://127.0.0.1:8011/api'
export const PASSWORD = 'Train!ng2026'

export function uniqueUser(prefix = 'e2e') {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return { username: `${prefix}_${id}`, email: `${prefix}_${id}@example.com`, password: PASSWORD }
}

export async function signupViaApi(request, user = uniqueUser()) {
  const response = await request.post(`${API}/auth/signup/`, { data: user })
  expect(response.ok(), await response.text()).toBeTruthy()
  return { user, session: await response.json() }
}

// Store a backend session the same way the app does after login.
export async function applySession(page, session) {
  await page.goto('/')
  await page.evaluate((s) => {
    localStorage.setItem('bt_access_token', s.tokens.access)
    localStorage.setItem('bt_refresh_token', s.tokens.refresh)
    localStorage.setItem('bt_user', JSON.stringify(s.user))
  }, session)
}

export async function signedInPage(page, request, prefix) {
  const { user, session } = await signupViaApi(request, uniqueUser(prefix))
  await applySession(page, session)
  return { user, session }
}

// Third-party resources are blocked or flaky offline; app errors are not.
const EXTERNAL = /(fonts\.g|wikipedia|jsdelivr|googleapis|unsplash|youtube|githubusercontent|supabase)/i

export function collectErrors(page) {
  const errors = []
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    const url = msg.location()?.url || ''
    if (EXTERNAL.test(text) || EXTERNAL.test(url) || /Failed to load resource/.test(text)) return
    errors.push(`console: ${text}`)
  })
  page.on('response', (res) => {
    if (res.url().startsWith(API) && res.status() >= 500) errors.push(`${res.status()} ${res.url()}`)
  })
  return errors
}

export async function expectNoHorizontalOverflow(page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth, 'page should not scroll sideways').toBeLessThanOrEqual(clientWidth)
}
