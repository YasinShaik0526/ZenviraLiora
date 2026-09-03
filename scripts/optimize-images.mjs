import { mkdir, readdir, copyFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const source = path.join(root, 'src', 'assets')
const productsDir = path.join(source, 'products')
const output = path.join(source, 'optimized')
const publicDir = path.join(root, 'public')
const publicProductsDir = path.join(publicDir, 'products')

await Promise.all([mkdir(output, { recursive: true }), mkdir(publicDir, { recursive: true }), mkdir(publicProductsDir, { recursive: true })])

// Every image dropped in src/assets/products is optimized using its own filename as the product slug.
const productFiles = (await readdir(productsDir)).filter((file) => /\.(jpe?g|png|webp)$/i.test(file))

await Promise.all(productFiles.map(async (file) => {
  const name = `${path.parse(file).name}.webp`
  await sharp(path.join(productsDir, file))
    .rotate()
    .resize({ width: 1400, height: 1750, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toFile(path.join(output, name))
  await copyFile(path.join(output, name), path.join(publicProductsDir, name))
}))

await Promise.all([
  sharp(path.join(source, 'zenvira-logo.png')).resize(320, 320, { fit: 'cover' }).webp({ quality: 88 }).toFile(path.join(output, 'zenvira-logo.webp')),
  sharp(path.join(source, 'zenvira-logo.png')).resize(96, 96, { fit: 'cover' }).webp({ quality: 88 }).toFile(path.join(publicDir, 'favicon.webp')),
  sharp(path.join(productsDir, 'kundan-petal-set.jpeg')).rotate().resize(1200, 630, { fit: 'cover', position: 'attention' }).webp({ quality: 84 }).toFile(path.join(publicDir, 'social-card.webp')),
])

console.log(`Optimized ${productFiles.length} product photos and 3 brand images.`)