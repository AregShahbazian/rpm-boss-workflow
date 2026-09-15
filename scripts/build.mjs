// Render the markdown tree to a browsable static site in dist/.
// - every .md becomes an .html page with the same relative path
// - README.md becomes index.html at the repo root
// - every directory gets an index.html listing its contents
// - all other files (images, canvas html, scripts) are copied as-is
import { marked } from 'marked'
import { cpSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

const SRC = '.'
const OUT = 'dist'            // the rpm-boss docs site -> areg.nl/rpm-boss/workflow/
const OUT_NARRATIVE = 'dist-narrative'  // the method page -> areg.nl/workflow/

// Absolute URLs, because the two sites live on different paths.
// Root-absolute, so the same markup works on areg.nl and in the local preview,
// which stages both sites under one root in the same shape.
const URL_NARRATIVE = '/workflow/'
const URL_DOCS = '/rpm-boss/workflow/'
const SKIP = new Set(['.git', '.github', '.idea', 'node_modules', 'scripts', 'dist', 'dist-narrative', '.preview'])
const SKIP_FILES = new Set(['package.json', 'package-lock.json', '.gitignore'])

marked.setOptions({ gfm: true })

const page = (title, crumbs, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root { --ink:#1a1a1a; --muted:#5a5a5a; --line:#d9d9d9; --accent:#1f4e79; }
  body { margin:0; background:#f2f2f2; color:var(--ink);
         font-family:"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif; line-height:1.5; }
  .page { max-width:860px; margin:24px auto; padding:36px 44px; background:#fff;
          box-shadow:0 1px 6px rgba(0,0,0,.12); }
  a { color:var(--accent); text-decoration:none; } a:hover { text-decoration:underline; }
  nav { font-size:.9rem; color:var(--muted); margin-bottom:18px; }
  h1,h2,h3 { line-height:1.2; } h1 { margin-top:0; }
  code { background:#f4f4f4; padding:1px 4px; border-radius:3px; font-size:.92em; }
  pre { background:#f7f7f7; border:1px solid var(--line); padding:12px; overflow-x:auto; }
  pre code { background:none; padding:0; }
  table { border-collapse:collapse; } th,td { border:1px solid var(--line); padding:4px 10px; }
  img { max-width:100%; }
  blockquote { border-left:3px solid var(--line); margin-left:0; padding-left:14px; color:var(--muted); }
  @media (max-width:640px) { .page { margin:0; padding:20px 16px; box-shadow:none; } }
</style>
</head>
<body><div class="page">${crumbs ? `<nav>${crumbs}</nav>` : ''}
${body}
</div></body></html>
`

const crumbsFor = (rel) => {
  const parts = rel.split('/').filter(Boolean)
  let out = [`<a href="${'../'.repeat(parts.length - 1) || './'}index.html">workflow docs</a>`]
  let acc = ''
  parts.slice(0, -1).forEach((p, i) => {
    out.push(`<a href="${'../'.repeat(parts.length - 2 - i)}index.html">${p}</a>`)
  })
  out.push(parts[parts.length - 1])
  return out.join(' / ')
}

// rewrite relative .md links to .html; leave http(s) and anchors alone
const rewriteLinks = (html) =>
  html
    .replace(/href="(?!https?:|#|mailto:)(?:[^"]*\/)?README\.md(#[^"]*)?"/g, `href="${URL_DOCS}$1"`)
    .replace(/href="(?!https?:|#|mailto:)(?:[^"]*\/)?index\.md(#[^"]*)?"/g, `href="${URL_NARRATIVE}$1"`)
    .replace(/href="(?!https?:|#|mailto:)([^"]+)\.md(#[^"]*)?"/g, 'href="$1.html$2"')
    .replace(/href="(?!https?:|#|mailto:|\/)([^"]+)\/"/g, 'href="$1/index.html"')
    // the surviving POC branch -> its GitHub tree
    .replace(
      /<code>poc\/live-rpm<\/code>/g,
      '<a href="https://github.com/AregShahbazian/rpm-boss/tree/poc/live-rpm"><code>poc/live-rpm</code></a>'
    )
    // code paths in the rpm-boss repo -> GitHub
    .replace(
      /<code>((?:src|test|public|assets|audio|scripts|android)\/[A-Za-z0-9_\-./]*)<\/code>/g,
      (m, p) =>
        `<a href="https://github.com/AregShahbazian/rpm-boss/${p.endsWith('/') ? 'tree' : 'blob'}/main/${p}"><code>${p}</code></a>`
    )

const entries = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (dir === SRC && SKIP.has(name)) continue
    if (SKIP_FILES.has(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) { walk(p) } else { entries.push(relative(SRC, p)) }
  }
}
walk(SRC)

const dirs = new Set([''])
for (const rel of entries) {
  let d = dirname(rel)
  while (d && d !== '.') { dirs.add(d); d = dirname(d) === '.' ? '' : dirname(d) }
}

const STAGES = ['prd.md', 'design.md', 'tasks.md', 'review.md']
const STAGE_DESC = {
  'prd.md': 'what to build and why',
  'design.md': 'how it will be built',
  'tasks.md': 'ordered implementation checklist',
  'review.md': 'verification checklist and findings',
}

// stage nav strip for pages living in a feature dir (mvp/<x>/ or features/<x>/)
const stageNav = (rel) => {
  const d = dirname(rel)
  if (!/^(mvp|features)\/[^/]+$/.test(d)) return ''
  const name = rel.slice(d.length + 1)
  const links = STAGES.filter((s) => entries.includes(join(d, s))).map((s) =>
    s === name
      ? `<b>${s.replace('.md', '')}</b>`
      : `<a href="${s.replace('.md', '.html')}">${s.replace('.md', '')}</a>`
  )
  return links.length > 1 ? ` &nbsp;|&nbsp; stages: ${links.join(' &middot; ')}` : ''
}

for (const rel of entries) {
  const out = join(OUT, rel)
  mkdirSync(dirname(out), { recursive: true })
  if (rel.endsWith('.md')) {
    const raw = readFileSync(rel, 'utf8')
    const title = (raw.match(/^#\s+(.+)$/m) || [, rel])[1]
    const html = rewriteLinks(marked.parse(raw))
    const isLanding = rel === 'index.md'
    const isDocsIndex = rel === 'README.md'
    const target = isLanding
      ? join(OUT_NARRATIVE, 'index.html')
      : isDocsIndex
        ? join(OUT, 'index.html')
        : out.replace(/\.md$/, '.html')
    if (isLanding) mkdirSync(OUT_NARRATIVE, { recursive: true })
    const crumbs = isLanding
      ? ''
      : isDocsIndex
        ? `<a href="${URL_NARRATIVE}">how I build software with LLMs</a> / rpm-boss workflow docs`
        : crumbsFor(rel) + stageNav(rel)
    writeFileSync(target, page(title, crumbs, html))
  } else {
    cpSync(rel, out)
  }
}

// per-directory listing index (root index comes from README.md)
for (const d of dirs) {
  if (d === '') continue
  const kids = readdirSync(d).filter((n) => !SKIP_FILES.has(n))
  // stage docs first in workflow order, then everything else alphabetically
  const rank = (n) => { const i = STAGES.indexOf(n); return i === -1 ? 100 : i }
  const items = kids.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map((n) => {
    const isDir = statSync(join(d, n)).isDirectory()
    const href = isDir ? `${n}/index.html` : n.endsWith('.md') ? n.replace(/\.md$/, '.html') : n
    const desc = STAGE_DESC[n] ? ` <span style="color:var(--muted)">- ${STAGE_DESC[n]}</span>` : ''
    return `<li><a href="${href}">${n}${isDir ? '/' : ''}</a>${desc}</li>`
  }).join('\n')
  writeFileSync(join(OUT, d, 'index.html'),
    page(d, crumbsFor(d + '/x').replace(/ \/ x$/, ''), `<h1>${d}/</h1>\n<ul>\n${items}\n</ul>`))
}

console.log(`built ${entries.length} files, ${dirs.size - 1} dir indexes -> ${OUT}/ and ${OUT_NARRATIVE}/`)
