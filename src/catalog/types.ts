export type Category = string

export type Collection = string

export type ProductAvailability = 'Available' | 'Limited' | 'Out of stock' | 'Confirm availability'
export type ProductStatus = 'draft' | 'published' | 'archived'

export type Product = {
  id: number
  sku: string
  name: string
  category: Category
  collection: Collection
  image: string
  images?: string[]
  note: string
  finish: string
  material: string
  dimensions: string
  weight: string
  colours: string[]
  occasions: string[]
  price?: number
  salePrice?: number
  availability?: ProductAvailability
  stockQuantity?: number
  lowStockLevel?: number
  badge?: string
  featured?: boolean
  status?: ProductStatus
}

export type BagItem = { product: Product; quantity: number }