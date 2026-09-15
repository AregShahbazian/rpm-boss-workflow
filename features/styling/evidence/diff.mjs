/** Pixel-compare two capture directories. node diff.mjs before after */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const [a, b] = process.argv.slice(2)
mkdirSync('diffs', { recursive: true })
let worst = 0
const rows = []

for (const name of readdirSync(a).filter((f) => f.endsWith('.png'))) {
  const A = PNG.sync.read(readFileSync(`${a}/${name}`))
  const B = PNG.sync.read(readFileSync(`${b}/${name}`))
  if (A.width !== B.width || A.height !== B.height) {
    rows.push([name, 'SIZE', `${A.width}x${A.height} vs ${B.width}x${B.height}`])
    continue
  }
  const out = new PNG({ width: A.width, height: A.height })
  const n = pixelmatch(A.data, B.data, out.data, A.width, A.height, { threshold: 0.1 })
  const pct = (100 * n) / (A.width * A.height)
  worst = Math.max(worst, pct)
  if (n > 0) {
    writeFileSync(`diffs/${name}`, PNG.sync.write(out))
    rows.push([name, n, `${pct.toFixed(3)}%`])
  }
}

if (!rows.length) console.log('IDENTICAL — all frames match')
else {
  console.log('differing frames:')
  for (const [name, n, pct] of rows.sort((x, y) => y[1] - x[1])) console.log(`  ${String(n).padStart(8)}  ${pct.padStart(8)}  ${name}`)
  console.log(`worst: ${worst.toFixed(3)}% of pixels`)
}
