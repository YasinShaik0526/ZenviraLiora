import localProducts from '../../content/products.json'
import { seedProducts } from './seedProducts'
import type { Product } from './types'

export const loadProducts = async (): Promise<Product[]> => {
  const publishedLocalProducts = (localProducts as Product[]).filter((product) => product.status !== 'draft' && product.status !== 'archived')
  return publishedLocalProducts.length ? publishedLocalProducts : seedProducts
}