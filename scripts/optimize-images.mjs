import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const source = path.join(root, 'src', 'assets')
const output = path.join(source, 'optimized')
const publicDir = path.join(root, 'public')

const productImages = [
  ['products/kundan 1 gram set.jpeg', 'kundan-petal-set.webp'],
  ['products/green 1 gram set.jpeg', 'emerald-arc-set.webp'],
  ['products/anti tarnish bracelets.jpeg', 'noir-clover-stack.webp'],
  ['products/stone rings.jpeg', 'celestial-stone-rings.webp'],
  ['products/kashmiri bangles.jpeg', 'kashmiri-heritage-bangles.webp'],
  ['products/1 gram layer set.jpeg', 'three-layer-celebration-set.webp'],
  ['products/black beed butterfly chain.jpeg', 'butterfly-bead-chain.webp'],
  ['products/panchaloham sets.jpeg', 'panchaloham-occasion-set.webp'],
]

await Promise.all([mkdir(output, { recursive: true }), mkdir(publicDir, { recursive: true })])

await Promise.all(productImages.map(([input, name]) => sharp(path.join(source, input))
  .rotate()
  .resize({ width: 1400, height: 1750, fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 82, effort: 5 })
  .toFile(path.join(output, name))))

await Promise.all([
  sharp(path.join(source, 'zenvira-logo.png')).resize(320, 320, { fit: 'cover' }).webp({ quality: 88 }).toFile(path.join(output, 'zenvira-logo.webp')),
  sharp(path.join(source, 'zenvira-logo.png')).resize(96, 96, { fit: 'cover' }).webp({ quality: 88 }).toFile(path.join(publicDir, 'favicon.webp')),
  sharp(path.join(source, 'products', 'kundan 1 gram set.jpeg')).rotate().resize(1200, 630, { fit: 'cover', position: 'attention' }).webp({ quality: 84 }).toFile(path.join(publicDir, 'social-card.webp')),
])

console.log(`Optimized ${productImages.length + 3} images.`)