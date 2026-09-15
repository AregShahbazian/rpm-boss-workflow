/** Dump the geometry of every element in the screen, keyed by DOM path. */
import { chromium } from 'playwright-core'

const URL = process.env.URL ?? 'http://localhost:5173/'
import { writeFileSync } from 'node:fs'

const out = process.argv[2]
const browser = await chromium.launch({ executablePath: '/opt/google/chrome/chrome' })
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 })
await context.addInitScript(() => localStorage.setItem('rpm-boss.theme', 'dark'))
const page = await context.newPage()
await page.goto(URL, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Try a sample' }).click()
await page.getByRole('button', { name: /Sample 1/ }).click()
await page.getByRole('button', { name: 'Calculate' }).waitFor({ timeout: 15000 })
await page.getByText('Expected range (optional)').click()
await page.getByRole('button', { name: 'Calculate' }).click()
await page.waitForTimeout(1500)

const data = await page.evaluate(() => {
  const path = (el) => {
    const bits = []
    for (let n = el; n && n.tagName !== 'BODY'; n = n.parentElement) {
      const i = [...n.parentElement.children].indexOf(n)
      bits.unshift(`${n.tagName}:${i}`)
    }
    return bits.join('/')
  }
  const rows = {}
  for (const el of document.querySelectorAll('main, main *')) {
    const r = el.getBoundingClientRect()
    rows[path(el)] = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join(',')
  }
  return rows
})
writeFileSync(out, JSON.stringify(data, null, 1))
await browser.close()
console.log('probed', Object.keys(data).length, 'elements')
