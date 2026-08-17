// Inlines the Vite production build into a single self-contained preview.html
// so the app can be previewed without a dev server. Fonts are embedded as data URIs.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const assetsDir = join(dist, 'assets')

const html = readFileSync(join(dist, 'index.html'), 'utf8')
const assetNames = readdirSync(assetsDir)
const cssName = assetNames.find((a) => a.endsWith('.css'))
const jsName = assetNames.find((a) => a.endsWith('.js'))
if (!cssName || !jsName) throw new Error('dist assets not found: run npm run build first')

let css = readFileSync(join(assetsDir, cssName), 'utf8')
css = css.replace(/url\(([^)]+)\)/g, (match, p) => {
  const clean = p.replace(/['"]/g, '').replace(/^\.\.?\//, '')
  try {
    const buf = readFileSync(join(dist, clean))
    const mime = clean.endsWith('.woff2') ? 'font/woff2' : 'font/woff'
    return `url(data:${mime};base64,${buf.toString('base64')})`
  } catch {
    return match
  }
})

let js = readFileSync(join(assetsDir, jsName), 'utf8')
// Escape anything that would terminate the inline <script> element early.
js = js.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--')

const out = html
  .replace(/<link rel="stylesheet"[^>]*>/, () => `<style>\n${css}\n</style>`)
  .replace(/<script type="module"[^>]*><\/script>/, () => `<script type="module">\n${js}\n</script>`)

writeFileSync(join(process.cwd(), 'preview.html'), out)
console.log('wrote preview.html')
