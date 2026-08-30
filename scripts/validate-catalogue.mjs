import { readFile } from 'node:fs/promises'

const products = JSON.parse(await readFile(new URL('../content/products.json', import.meta.url), 'utf8'))
const errors = []
const skus = new Set()

if (!Array.isArray(products)) errors.push('Catalogue must contain a JSON array.')

for (const [index, product] of (Array.isArray(products) ? products : []).entries()) {
  const label = product?.sku || `record ${index + 1}`
  for (const field of ['id', 'sku', 'name', 'category', 'collection', 'image', 'note']) {
    if (product?.[field] === undefined || product[field] === '') errors.push(`${label}: ${field} is required.`)
  }
  if (skus.has(product.sku)) errors.push(`${label}: SKU must be unique.`)
  skus.add(product.sku)
  if (!['draft', 'published', 'archived'].includes(product.status ?? 'published')) errors.push(`${label}: invalid status.`)
  if (product.price !== undefined && (!Number.isFinite(product.price) || product.price < 0)) errors.push(`${label}: price must be zero or greater.`)
  if (product.salePrice !== undefined && (!Number.isFinite(product.salePrice) || product.salePrice < 0 || product.salePrice >= product.price)) errors.push(`${label}: sale price must be lower than regular price.`)
  if (product.stockQuantity !== undefined && (!Number.isInteger(product.stockQuantity) || product.stockQuantity < 0)) errors.push(`${label}: stock quantity must be a non-negative whole number.`)
  if (!Array.isArray(product.colours) || !Array.isArray(product.occasions)) errors.push(`${label}: colours and occasions must be arrays.`)
}

if (errors.length) {
  console.error(`Catalogue validation failed:\n- ${errors.join('\n- ')}`)
  process.exit(1)
}

console.log(`Validated ${products.length} catalogue products.`)
