/**
 * Capture the app in every state that has any styling in it, at four screen
 * shapes and in both themes. Run once before the refactor and once after; the
 * two directories are then compared pixel for pixel by diff.mjs.
 *
 *   node shoot.mjs <outdir>
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const OUT = process.argv[2]
const URL = process.env.URL ?? 'http://localhost:5173/'
if (!OUT) throw new Error('usage: node shoot.mjs <outdir>')
mkdirSync(OUT, { recursive: true })

const SCREENS = {
  'mobile-portrait': { width: 390, height: 844 },
  'mobile-landscape': { width: 844, height: 390 },
  'tablet-portrait': { width: 820, height: 1180 },
  'tablet-landscape': { width: 1180, height: 820 },
}

const browser = await chromium.launch({ executablePath: '/opt/google/chrome/chrome' })

// Fonts and the canvas both settle a frame or two after React commits.
const settle = (page) => page.waitForTimeout(350)

async function shot(page, name) {
  await settle(page)
  await page.screenshot({ path: `${OUT}/${name}.png` })
}

/** A sample clip, through the same path an upload takes. */
async function loadSample(page) {
  await page.getByRole('button', { name: 'Try a sample' }).click()
  await page.getByRole('button', { name: /Sample 1/ }).click()
  await page.getByRole('button', { name: 'Calculate' }).waitFor({ timeout: 15000 })
}

for (const [screen, viewport] of Object.entries(SCREENS)) {
  for (const theme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
    await context.addInitScript(
      ([t]) => localStorage.setItem('rpm-boss.theme', t),
      [theme],
    )
    const page = await context.newPage()
    await page.goto(URL, { waitUntil: 'networkidle' })

    await shot(page, `${screen}--${theme}--empty`)

    // Both sheets, on the empty screen, where they are unobstructed.
    if (theme === 'dark') {
      await page.getByRole('button', { name: 'Try a sample' }).click()
      await shot(page, `${screen}--${theme}--sheet-samples`)
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Settings' }).click()
      await shot(page, `${screen}--${theme}--sheet-settings`)
      await page.keyboard.press('Escape')
      await settle(page)
    }

    await loadSample(page)
    await shot(page, `${screen}--${theme}--loaded`)

    // The expected-range panel is collapsed by default and has its own rules.
    await page.getByText('Expected range (optional)').click()
    await shot(page, `${screen}--${theme}--range-open`)
    await page.getByText('Expected range (optional)').click()

    await page.getByRole('button', { name: 'Calculate' }).click()
    await page.waitForTimeout(1500)
    await shot(page, `${screen}--${theme}--result`)

    await context.close()
  }
}

await browser.close()
console.log('done')
