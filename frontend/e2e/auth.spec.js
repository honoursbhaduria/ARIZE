import { expect, test } from '@playwright/test'
import { collectErrors, signupViaApi, uniqueUser } from './helpers'

test.describe('auth & onboarding', () => {
  test('landing page leads to sign up', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Train harder')
    await page.getByRole('link', { name: /start training/i }).first().click()
    await expect(page).toHaveURL(/\/register$/)
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('signed-out visitors are sent to login and returned afterwards', async ({ page, request }) => {
    const { user } = await signupViaApi(request)
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fsettings/)

    await page.getByLabel('Email or username').fill(user.email)
    await page.getByLabel('Password', { exact: true }).fill(user.password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()

    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
  })

  test('wrong password shows a clear error', async ({ page, request }) => {
    const { user } = await signupViaApi(request)
    await page.goto('/login')
    await page.getByLabel('Email or username').fill(user.username)
    await page.getByLabel('Password', { exact: true }).fill('not-the-password')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText(/invalid/i)
    await expect(page).toHaveURL(/\/login/)
  })

  test('new player registers, completes setup and lands on Home Base', async ({ page }) => {
    const errors = collectErrors(page)
    const user = uniqueUser('reg')
    await page.goto('/register')
    await page.getByLabel('Username').fill(user.username)
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password', { exact: true }).fill(user.password)
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page).toHaveURL(/\/onboarding$/)
    await page.getByLabel('Age').fill('28')
    await page.getByLabel('Weight (kg)').fill('80')
    await page.getByLabel('Height (cm)').fill('180')
    await page.getByRole('radio', { name: /^Male/ }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('radio', { name: /Muscle Gain/ }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('radio', { name: /Non-Vegetarian/ }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Finish setup' }).click()

    await expect(page.getByRole('heading', { name: 'Character created!' })).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText(user.username)
    // Weight and height from onboarding feed the BMI card: 80 / 1.8² = 24.7
    await expect(page.getByText('24.7', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('80 kg · 180 cm')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('female players get the women’s health steps and can finish with them blank', async ({ page }) => {
    const user = uniqueUser('fem')
    await page.goto('/register')
    await page.getByLabel('Username').fill(user.username)
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password', { exact: true }).fill(user.password)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/\/onboarding$/)

    await page.getByRole('radio', { name: /^Female/ }).click()
    await expect(page.getByText(/Step 1 \/ 7/)).toBeVisible()
    for (let i = 0; i < 6; i += 1) await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Finish setup' }).click()
    await expect(page.getByRole('heading', { name: 'Character created!' })).toBeVisible()
  })

  test('one-click demo signs in and logout ends the session', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /1-click demo/i }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('demo_user')

    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page).toHaveURL(/\/login/)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
