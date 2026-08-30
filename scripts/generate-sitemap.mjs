import { rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const siteUrl = (process.env.VITE_SITE_URL ?? '').trim().replace(/\/$/, '')
const output = path.join(process.cwd(), 'public', 'sitemap.xml')

if (!siteUrl) {
  await rm(output, { force: true })
  console.log('Skipping sitemap: VITE_SITE_URL is not configured.')
  process.exit(0)
}

const routes = ['', '/shop', '/story', '/care', '/contact', '/privacy', '/terms', '/shipping', '/returns']
const urls = routes.map((route) => `  <url><loc>${siteUrl}${route}</loc></url>`).join('\n')
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

await writeFile(output, sitemap)
console.log(`Generated sitemap for ${siteUrl}.`)