/** The Urdu build, which is the only check that catches a physical size utility. */
import { chromium } from 'playwright-core'

const URL = process.env.URL ?? 'http://localhost:5173/'
import { mkdirSync } from 'node:fs'
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })
const SCREENS = {
  'mobile-portrait': { width: 390, height: 844 },
  'mobile-landscape': { width: 844, height: 390 },
  'tablet-portrait': { width: 820, height: 1180 },
  'tablet-landscape': { width: 1180, height: 820 },
}
const browser = await chromium.launch({ executablePath: '/opt/google/chrome/chrome' })
for (const [screen, viewport] of Object.entries(SCREENS)) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await context.addInitScript(() => {
    localStorage.setItem('rpm-boss.theme', 'dark')
    localStorage.setItem('rpm-boss.language', 'ur')
  })
  const page = await context.newPage()
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/${screen}--ur--empty.png` })
  const samples = page.locator('button[aria-label]').nth(0)
  await samples.click()
  await page.getByRole('button', { name: /Sample 1/ }).click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/${screen}--ur--loaded.png` })
  // The horizontal scrollbar is the failure this is looking for.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  console.log(screen, 'horizontal overflow:', overflow, 'px')
  await context.close()
}
await browser.close()
