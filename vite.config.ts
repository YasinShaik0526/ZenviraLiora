import react from '@vitejs/plugin-react'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

const catalogueFile = resolve(import.meta.dirname, 'content/products.json')

const isProduct = (value: unknown) => {
  if (!value || typeof value !== 'object') return false
  const product = value as Record<string, unknown>
  return typeof product.id === 'number'
    && typeof product.sku === 'string'
    && typeof product.name === 'string'
    && typeof product.category === 'string'
    && typeof product.collection === 'string'
    && typeof product.image === 'string'
    && typeof product.note === 'string'
    && Array.isArray(product.colours)
    && Array.isArray(product.occasions)
}

const localCatalogue = (): Plugin => ({
  name: 'local-catalogue',
  configureServer(server) {
    server.middlewares.use('/api/local-catalogue', async (request, response) => {
      response.setHeader('Content-Type', 'application/json')
      try {
        if (request.method === 'GET') {
          response.end(await readFile(catalogueFile, 'utf8'))
          return
        }
        if (request.method !== 'PUT') {
          response.statusCode = 405
          response.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        for await (const chunk of request) body += chunk
        const products: unknown = JSON.parse(body)
        if (!Array.isArray(products) || !products.every(isProduct)) {
          response.statusCode = 400
          response.end(JSON.stringify({ error: 'Invalid catalogue data' }))
          return
        }
        const skus = products.map((product) => (product as Record<string, unknown>).sku)
        if (new Set(skus).size !== skus.length) {
          response.statusCode = 400
          response.end(JSON.stringify({ error: 'Every SKU must be unique' }))
          return
        }

        const temporaryFile = `${catalogueFile}.tmp`
        await writeFile(temporaryFile, `${JSON.stringify(products, null, 2)}\n`, 'utf8')
        await rename(temporaryFile, catalogueFile)
        response.end(JSON.stringify({ saved: true }))
      } catch (error) {
        response.statusCode = 500
        response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to save catalogue' }))
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localCatalogue()],
})
