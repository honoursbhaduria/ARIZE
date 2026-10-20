// Extracts the background "recipe" (layers, colours, sizing) from a live page.
// Usage: node scripts/extract_background.mjs [url] > background.json
// Needs playwright-core and a local Chrome (CHROME_PATH, default /usr/bin/google-chrome).
import { chromium } from 'playwright-core'

const url = process.argv[2] || 'https://www.boot.dev/'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })

const recipe = await page.evaluate(() => {
  const props = [
    'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundRepeat',
    'backgroundPosition', 'backgroundAttachment', 'backgroundBlendMode', 'opacity', 'mixBlendMode',
  ]
  const seen = new Set()
  const layers = []
  for (const el of document.querySelectorAll('body, body *')) {
    const style = getComputedStyle(el)
    if (style.backgroundImage === 'none' && style.backgroundColor === 'rgba(0, 0, 0, 0)') continue
    const rect = el.getBoundingClientRect()
    if (rect.width < window.innerWidth * 0.8 || rect.height < 300) continue // only page-wide backgrounds
    const entry = Object.fromEntries(props.map((p) => [p, style[p]]))
    const key = JSON.stringify(entry)
    if (seen.has(key)) continue
    seen.add(key)
    layers.push({ element: `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`, width: Math.round(rect.width), height: Math.round(rect.height), ...entry })
  }
  const root = getComputedStyle(document.documentElement)
  const palette = {}
  for (const name of ['gray-950', 'gray-900', 'gray-850', 'gray-800', 'gray-750', 'gray-700', 'gray-400', 'gray-200', 'gray-100', 'yellow-500', 'yellow-600', 'yellow-950', 'green-500', 'green-600', 'cyan-500', 'red-500']) {
    const value = root.getPropertyValue(`--${name}`).trim()
    if (value) palette[name] = value
  }
  return { url: location.href, bodyColor: getComputedStyle(document.body).backgroundColor, palette, layers }
})

console.log(JSON.stringify(recipe, null, 2))
await browser.close()
