import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run the real Django API and the Vite app on their own ports
// with a throwaway SQLite database, so they never touch your dev data.
//   npx playwright test              (uses your installed Google Chrome)
//   PYTHON=/path/to/python npx playwright test
const PYTHON = process.env.PYTHON || (existsSync('../.venv/bin/python') ? resolve('../.venv/bin/python') : 'python3')
const API_PORT = 8011
const WEB_PORT = 5181
const DB = resolve('test-results/e2e.sqlite3')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    channel: process.env.PW_CHANNEL || 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL || 'chrome', viewport: { width: 1366, height: 860 } },
      testIgnore: /mobile\.spec\.js/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], channel: process.env.PW_CHANNEL || 'chrome' },
      testMatch: /mobile\.spec\.js/,
    },
  ],
  webServer: [
    {
      command: `mkdir -p test-results && rm -f ${DB} && cd ../backend && SQLITE_PATH=${DB} ${PYTHON} manage.py migrate --noinput >/dev/null && SQLITE_PATH=${DB} ${PYTHON} manage.py runserver 127.0.0.1:${API_PORT} --noreload`,
      url: `http://127.0.0.1:${API_PORT}/api/health/`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // Empty Supabase vars force plain backend auth so tests are deterministic offline.
      command: `npx vite --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        VITE_API_BASE_URL: `http://127.0.0.1:${API_PORT}/api`,
        VITE_SUPABASE_URL: '',
        VITE_SUPABASE_ANON_KEY: '',
      },
    },
  ],
})
