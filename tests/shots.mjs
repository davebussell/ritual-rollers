// Screenshot pages at phone and desktop widths and flag horizontal overflow.
//   node tests/shots.mjs http://localhost:3000 /tmp/rr-shots / /spots /spots/<slug> ...
import { createRequire } from 'module'
const { chromium } = createRequire(import.meta.url)('playwright') // the sandbox's global Playwright
import { mkdirSync } from 'fs'

const [base, outDir, ...paths] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
const problems = []
for (const width of [375, 1280]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  for (const path of paths) {
    const res = await page.goto(base + path, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => ({ status: () => `ERR ${e.message}` }))
    await page.waitForTimeout(800)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    const name = `${outDir}/${width}${path.replace(/[^a-z0-9]+/gi, '_') || '_home'}.png`
    await page.screenshot({ path: name, fullPage: true })
    const line = `${width}px ${path} → ${res?.status?.()} overflow ${overflow}px`
    console.log(line)
    if (overflow > 1) problems.push(line)
  }
  await page.close()
}
await browser.close()
if (problems.length) { console.log('\nOVERFLOW:\n' + problems.join('\n')); process.exitCode = 1 }
