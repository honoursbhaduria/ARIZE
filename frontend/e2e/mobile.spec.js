import { expect, test } from '@playwright/test'
import { collectErrors, expectNoHorizontalOverflow, signedInPage } from './helpers'

const APP_PAGES = [
  '/dashboard', '/counter', '/vision', '/chat', '/nutrition', '/heart-health',
  '/shopping-cart', '/analytics', '/gallery', '/integrations', '/settings', '/posture-reading?topic=Squat',
]

test.describe('mobile', () => {
  test('public pages fit the screen', async ({ page }) => {
    const errors = collectErrors(page)
    for (const path of ['/', '/login', '/register', '/nope']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalOverflow(page)
    }
    expect(errors).toEqual([])
  })

  test('every app page fits the screen and uses the bottom tab bar', async ({ page, request }) => {
    const errors = collectErrors(page)
    await signedInPage(page, request, 'mob')
    for (const path of APP_PAGES) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await expect(page.getByRole('navigation', { name: 'Quick navigation' })).toBeVisible()
      // Desktop sidebar must be hidden on phones.
      await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeHidden()
    }
    expect(errors).toEqual([])
  })

  test('tab bar and More sheet navigate', async ({ page, request }) => {
    await signedInPage(page, request, 'tabs')
    await page.goto('/dashboard')
    const tabs = page.getByRole('navigation', { name: 'Quick navigation' })

    await tabs.getByRole('link', { name: 'Coach' }).click()
    await expect(page).toHaveURL(/\/chat$/)

    await tabs.getByRole('button', { name: 'More' }).click()
    const sheet = page.getByRole('dialog', { name: 'Everything' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('link', { name: 'Settings' }).click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(sheet).toBeHidden()
  })

  test('onboarding is usable on a phone', async ({ page, request }) => {
    await signedInPage(page, request, 'mobon')
    await page.goto('/onboarding')
    await expectNoHorizontalOverflow(page)
    await page.getByLabel('Age').fill('30')
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('heading', { name: 'Choose your path' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})
