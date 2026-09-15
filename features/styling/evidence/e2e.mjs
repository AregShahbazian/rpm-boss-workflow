/**
 * Drive the app and report what it did. Run against the pre-refactor server
 * and the post-refactor one; the two reports must be the same, which is a
 * stronger claim than "it still looks right".
 */
import { chromium } from 'playwright-core'

const URL = process.env.URL ?? 'http://localhost:5173/'
const SCREENS = {
  'mobile-portrait': { width: 390, height: 844 },
  'mobile-landscape': { width: 844, height: 390 },
  'tablet-portrait': { width: 820, height: 1180 },
  'tablet-landscape': { width: 1180, height: 820 },
}
const out = []
const say = (...a) => out.push(a.join(' '))
const browser = await chromium.launch({ executablePath: '/opt/google/chrome/chrome' })

for (const [screen, viewport] of Object.entries(SCREENS)) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await context.addInitScript(() => localStorage.setItem('rpm-boss.theme', 'dark'))
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(URL, { waitUntil: 'networkidle' })

  say(`\n## ${screen}`)
  say('idle status:', (await page.locator('main p').first().innerText()).trim())

  // 1. Load a sample through the sheet.
  await page.getByRole('button', { name: 'Try a sample' }).click()
  say('samples sheet open:', await page.locator('dialog[open]').count())
  await page.getByRole('button', { name: /Sample 1/ }).click()
  await page.getByRole('button', { name: 'Calculate' }).waitFor({ timeout: 15000 })
  say('loaded status:', (await page.locator('main p').first().innerText()).trim())

  // 2. Crop: drag the right handle in and read the window back.
  const wave = page.locator('canvas').last()
  const box = await wave.boundingBox()
  const before = await page.locator('p[dir="ltr"]').first().innerText()
  // The left handle sits at the start of the selection, which is the left edge
  // of the detail view until something moves it.
  await page.mouse.move(box.x + 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  const after = await page.locator('p[dir="ltr"]').first().innerText()
  say('crop readout changed:', before.trim() !== after.trim(), '->', after.trim())

  // 3. Play, and check the position advances.
  await page.getByRole('button', { name: /Play/ }).click()
  await page.waitForTimeout(900)
  const playing = await page.locator('button').filter({ hasText: /Stop/ }).count()
  say('playing:', playing > 0)
  await page.getByRole('button', { name: /Stop/ }).first().click()

  // 4. Calculate.
  await page.getByRole('button', { name: 'Calculate' }).click()
  await page.locator('[data-testid="result"]').waitFor({ timeout: 20000 })
  say('result:', (await page.locator('[data-testid="result"]').innerText()).replace(/\s+/g, ' ').trim())
  say('caption:', (await page.locator('[data-testid="result-caption"]').innerText()).trim())

  // 5. The expected range panel remembers whether it is open.
  await page.getByText('Expected range (optional)').click()
  say('range open:', await page.locator('details[open]').count())
  // `toggle` is dispatched after the open attribute changes, so the write the
  // handler does is not there yet the instant the attribute says it is open.
  await page.waitForTimeout(400)
  say('range choice stored:', await page.evaluate(() => localStorage.getItem('rpm-boss.range-open')))

  // 6. Settings: theme switch, and what the canvas is painted with.
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('radio', { name: 'Light' }).click()
  await page.waitForTimeout(200)
  say('data-theme:', await page.evaluate(() => document.documentElement.dataset.theme))
  say(
    'canvas accent token:',
    await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() ||
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()),
  )
  say('body background:', await page.evaluate(() => getComputedStyle(document.body).backgroundColor))

  // 7. Close the sheet by pressing the backdrop, well outside the box.
  await page.mouse.click(4, 4)
  await page.waitForTimeout(200)
  say('sheet closed by backdrop:', (await page.locator('dialog[open]').count()) === 0)

  say('horizontal overflow:', await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'px')
  say('console errors:', errors.length ? errors.join(' | ') : 'none')
  await context.close()
}

await browser.close()
console.log(out.join('\n'))
