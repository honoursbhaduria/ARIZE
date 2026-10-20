import { expect, test } from '@playwright/test'
import { API, collectErrors, signedInPage } from './helpers'

// 1x1 PNG for upload tests
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

test.describe('app features', () => {
  test('every app page loads without errors', async ({ page, request }) => {
    const errors = collectErrors(page)
    await signedInPage(page, request, 'nav')
    const pages = [
      ['/dashboard', 'Welcome back'],
      ['/counter', 'Workout Coach'],
      ['/vision', 'Vision Lab'],
      ['/chat', 'AI Coach'],
      ['/nutrition', 'Nutrition'],
      ['/heart-health', 'Heart Health'],
      ['/shopping-cart', 'Wish List'],
      ['/analytics', 'Stats & Streaks'],
      ['/gallery', 'Progress Gallery'],
      ['/integrations', 'Integrations'],
      ['/settings', 'Settings'],
      ['/posture-reading?topic=Squat', 'Squat'],
    ]
    for (const [path, heading] of pages) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading)
    }
    expect(errors).toEqual([])
  })

  test('sidebar navigation is client-side and highlights the current page', async ({ page, request }) => {
    await signedInPage(page, request, 'side')
    await page.goto('/dashboard')
    const sidebar = page.getByRole('complementary', { name: 'Main navigation' })
    await sidebar.getByRole('link', { name: 'Stats & Streaks' }).click()
    await expect(page).toHaveURL(/\/analytics$/)
    await expect(sidebar.getByRole('link', { name: 'Stats & Streaks' })).toHaveAttribute('data-status', 'active')
  })

  test('daily quests: add, complete, delete and persist', async ({ page, request }) => {
    await signedInPage(page, request, 'quest')
    await page.goto('/dashboard')

    await page.getByLabel('New quest').fill('20 min run')
    await page.getByRole('button', { name: 'Add quest' }).click()
    await expect(page.getByText('20 min run')).toBeVisible()

    await page.getByRole('button', { name: 'Complete 20 min run' }).click()
    await expect(page.getByText(/Quest complete: 20 min run/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark 20 min run as not done' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('button', { name: 'Mark 20 min run as not done' })).toBeVisible()

    await page.getByRole('button', { name: 'Delete Squats' }).click()
    await expect(page.getByText('Squats', { exact: true })).toHaveCount(0)
  })

  test('AI plan replaces quests (AI mocked)', async ({ page, request }) => {
    await page.route(`${API}/workouts/ai-plan/`, (route) =>
      route.fulfill({ json: { plan: [{ id: 'ai-1', title: 'Kettlebell swings', details: '4 x 15', reps: 60, done: false }] } }))
    await signedInPage(page, request, 'aiplan')
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'AI plan' }).click()
    await page.getByLabel('Describe the workout you want').fill('leg day')
    await page.getByRole('button', { name: 'Generate' }).click()
    await expect(page.getByText('Kettlebell swings')).toBeVisible()
    await expect(page.getByText('Squats', { exact: true })).toHaveCount(0)
  })

  test('settings: saving with empty age works and weight drives BMI', async ({ page, request }) => {
    await signedInPage(page, request, 'set')
    await page.goto('/settings')
    await page.getByLabel('Age').fill('')
    await page.getByLabel('Weight (kg)').fill('63')
    await page.getByRole('button', { name: 'Save profile' }).click()
    await expect(page.getByText('Profile updated')).toBeVisible()

    await page.goto('/dashboard')
    // 63 / 1.7² = 21.8 → Normal
    await expect(page.getByText('21.8', { exact: true })).toBeVisible()
    await expect(page.getByText('Normal', { exact: true }).first()).toBeVisible()
  })

  test('settings: notification preferences save', async ({ page, request }) => {
    await signedInPage(page, request, 'prefs')
    await page.goto('/settings')
    const toggle = page.getByRole('checkbox', { name: 'WhatsApp updates' })
    await expect(toggle).not.toBeChecked()
    await toggle.check()
    await page.getByRole('button', { name: 'Update preferences' }).click()
    await expect(page.getByText('Preferences saved')).toBeVisible()
    await page.reload()
    await expect(page.getByRole('checkbox', { name: 'WhatsApp updates' })).toBeChecked()
  })

  test('settings: change password, then sign in with the new one', async ({ page, request }) => {
    const { user } = await signedInPage(page, request, 'pw')
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Change password' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Current password').fill(user.password)
    await dialog.getByLabel('New password', { exact: true }).fill('Brand-new-pass-77')
    await dialog.getByLabel('Confirm new password').fill('Brand-new-pass-77')
    await dialog.getByRole('button', { name: 'Update password' }).click()
    await expect(page.getByText('Password updated')).toBeVisible()

    const ok = await request.post(`${API}/auth/login/`, { data: { username: user.username, password: 'Brand-new-pass-77' } })
    expect(ok.status()).toBe(200)
    const old = await request.post(`${API}/auth/login/`, { data: { username: user.username, password: user.password } })
    expect(old.status()).toBe(401)
  })

  test('settings: wrong current password is rejected', async ({ page, request }) => {
    await signedInPage(page, request, 'pwbad')
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Change password' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Current password').fill('nope-nope')
    await dialog.getByLabel('New password', { exact: true }).fill('Brand-new-pass-77')
    await dialog.getByLabel('Confirm new password').fill('Brand-new-pass-77')
    await dialog.getByRole('button', { name: 'Update password' }).click()
    await expect(dialog.getByRole('alert')).toContainText('Current password is incorrect')
  })

  test('progress gallery: upload a photo and open it', async ({ page, request }) => {
    await signedInPage(page, request, 'gal')
    await page.goto('/gallery')
    await expect(page.getByText('No entries yet')).toBeVisible()
    await page.getByRole('button', { name: 'Add entry' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input[type=file]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG })
    await dialog.getByLabel('Note / current weight').fill('Day 1')
    await dialog.getByRole('button', { name: 'Save entry' }).click()
    await expect(page.getByText('Progress entry saved')).toBeVisible()
    await expect(page.getByText('Day 1')).toBeVisible()
    await page.getByRole('button', { name: /Open photo from/ }).first().click()
    await expect(page.getByRole('dialog').getByText('Day 1')).toBeVisible()
  })

  test('wish list: change quantity, remove and clear', async ({ page, request }) => {
    const { session } = await signedInPage(page, request, 'cart')
    const headers = { Authorization: `Bearer ${session.tokens.access}` }
    for (const name of ['Whey protein', 'Oats']) {
      const res = await request.post(`${API}/shopping/cart/add/`, { headers, data: { product_name: name, quantity: 1 } })
      expect(res.ok()).toBeTruthy()
    }
    await page.goto('/shopping-cart')
    await expect(page.getByText('Whey protein')).toBeVisible()

    await page.getByRole('button', { name: 'Increase quantity' }).first().click()
    await expect(page.getByText(/3 items saved/)).toBeVisible()

    await page.getByRole('button', { name: 'Remove Oats' }).click()
    await expect(page.getByText('Oats')).toHaveCount(0)

    await page.getByRole('button', { name: 'Clear all' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Clear all' }).click()
    await expect(page.getByText('Your wish list is empty')).toBeVisible()
  })

  test('heart health prediction shows a stage and actions', async ({ page, request }) => {
    await signedInPage(page, request, 'heart')
    await page.goto('/heart-health')
    await page.getByRole('radio', { name: '130+' }).click()
    await page.getByRole('button', { name: 'Predict heart health' }).click()
    await expect(page.getByText('Predicted stage')).toBeVisible()
    await expect(page.getByText('Recommended actions')).toBeVisible()
  })

  test('AI coach chat answers and history can be cleared (AI mocked)', async ({ page, request }) => {
    await page.route(`${API}/chat/ask/`, (route) => route.fulfill({ json: { answer: 'Eat 30g protein after training.', source: 'groq_ai' } }))
    await signedInPage(page, request, 'chat')
    await page.goto('/chat')
    await page.getByRole('button', { name: 'What should I eat for muscle gain?' }).click()
    await expect(page.getByText('Eat 30g protein after training.')).toBeVisible()

    await page.reload()
    await expect(page.getByText('Eat 30g protein after training.')).toBeVisible()

    await page.getByRole('button', { name: 'Clear chat history' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Clear history' }).click()
    await expect(page.getByText('Your coach is ready')).toBeVisible()
  })

  test('nutrition calorie finder shows macros (AI mocked)', async ({ page, request }) => {
    await page.route(`${API}/nutrition/search/groq/`, (route) =>
      route.fulfill({ json: { food: 'Grilled chicken', calories: 330, protein: 62, carbs: 0, fats: 7 } }))
    await signedInPage(page, request, 'food')
    await page.goto('/nutrition')
    await page.getByLabel('Food to look up').fill('200g grilled chicken')
    await page.getByRole('button', { name: 'Search' }).click()
    await expect(page.getByText('Grilled chicken')).toBeVisible()
    await expect(page.getByText('330')).toBeVisible()
    await expect(page.getByText('62')).toBeVisible()
  })

  test('workout coach controls work without a camera', async ({ page, request }) => {
    await signedInPage(page, request, 'coach')
    await page.goto('/counter')
    await page.getByRole('radio', { name: /Push-ups/ }).click()
    await expect(page.getByRole('radio', { name: /Push-ups/ })).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('button', { name: 'More reps' }).click()
    await expect(page.getByLabel('Target reps')).toHaveValue('21')
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  test('unknown routes show the 404 page', async ({ page }) => {
    await page.goto('/this/does/not/exist')
    await expect(page.getByRole('heading', { name: 'You wandered off the map' })).toBeVisible()
  })
})
