import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import type { Product, ProductAvailability, ProductStatus } from '../catalog/types'
import './AdminCatalogue.css'

const emptyProduct = (id: number): Product => ({
  id,
  sku: '',
  name: '',
  category: 'Necklaces',
  collection: 'Curated Jewellery',
  image: '',
  note: '',
  finish: '',
  material: '',
  dimensions: '',
  weight: '',
  colours: [],
  occasions: [],
  availability: 'Confirm availability',
  lowStockLevel: 2,
  status: 'draft',
})

const listValue = (values: string[]) => values.join(', ')
const parseList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)
const stockAvailability = (quantity: number, lowStockLevel: number): ProductAvailability => quantity <= 0 ? 'Out of stock' : quantity <= lowStockLevel ? 'Limited' : 'Available'

export default function AdminCatalogue() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [message, setMessage] = useState('Loading catalogue...')

  useEffect(() => {
    void fetch('/api/local-catalogue').then(async (response) => {
      if (!response.ok) throw new Error('The local editor is available only through npm run dev.')
      return response.json() as Promise<Product[]>
    }).then((data) => {
      setProducts(data)
      setSelectedId(data[0]?.id ?? null)
      setMessage('')
    }).catch((error: Error) => setMessage(error.message))
  }, [])

  const selected = products.find((product) => product.id === selectedId)
  const update = (patch: Partial<Product>) => setProducts((current) => current.map((product) => product.id === selectedId ? { ...product, ...patch } : product))
  const addProduct = () => {
    const id = Math.max(0, ...products.map((product) => product.id)) + 1
    setProducts((current) => [...current, emptyProduct(id)])
    setSelectedId(id)
    setMessage('New draft added. Complete the details, then save.')
  }
  const removeProduct = () => {
    if (!selected || !confirm(`Delete ${selected.name || selected.sku || 'this draft'}?`)) return
    setProducts((current) => current.filter((product) => product.id !== selected.id))
    setSelectedId(products.find((product) => product.id !== selected.id)?.id ?? null)
  }
  const save = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('Saving...')
    const response = await fetch('/api/local-catalogue', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(products) })
    const result = await response.json() as { error?: string }
    setMessage(response.ok ? 'Saved to content/products.json. Changes are ready for Git.' : result.error || 'Unable to save.')
  }

  return <main className="catalogue-admin">
    <header><div><p>Local catalogue</p><h1>Products and stock</h1></div><a href="/"><ArrowLeft /> Storefront</a></header>
    <div className="admin-layout">
      <aside><button className="admin-primary" onClick={addProduct}><Plus /> Add product</button><nav>{products.map((product) => <button className={selectedId === product.id ? 'active' : ''} key={product.id} onClick={() => setSelectedId(product.id)}><strong>{product.name || 'New product'}</strong><span>{product.sku || 'No SKU'} · {product.status || 'published'}</span></button>)}</nav></aside>
      <section>
        {!selected && <div className="admin-empty"><h2>No products yet</h2><button className="admin-primary" onClick={addProduct}><Plus /> Add first product</button></div>}
        {selected && <form onSubmit={save}>
          <div className="form-heading"><div><span>{selected.sku || 'New SKU'}</span><h2>{selected.name || 'Untitled product'}</h2></div><button type="button" className="danger-button" onClick={removeProduct}><Trash2 /> Delete</button></div>
          <div className="admin-fields">
            <label>SKU<input required value={selected.sku} onChange={(event) => update({ sku: event.target.value.toUpperCase() })} /></label>
            <label>Product name<input required value={selected.name} onChange={(event) => update({ name: event.target.value })} /></label>
            <label>Category<input required list="category-options" value={selected.category} onChange={(event) => update({ category: event.target.value })} /><datalist id="category-options">{['Necklaces','Earrings','Rings','Bangles','Bracelets','Mangalsutras','Kids Jewellery'].map((item) => <option key={item}>{item}</option>)}</datalist></label>
            <label>Collection<input required value={selected.collection} onChange={(event) => update({ collection: event.target.value })} /></label>
            <label>Regular price (₹)<input type="number" min="0" step="1" value={selected.price ?? ''} onChange={(event) => update({ price: event.target.value ? Number(event.target.value) : undefined })} /></label>
            <label>Sale price (₹)<input type="number" min="0" step="1" value={selected.salePrice ?? ''} onChange={(event) => update({ salePrice: event.target.value ? Number(event.target.value) : undefined })} /></label>
            <label>Current stock<input type="number" min="0" step="1" value={selected.stockQuantity ?? ''} onChange={(event) => { const stockQuantity = event.target.value ? Number(event.target.value) : 0; update({ stockQuantity, availability: stockAvailability(stockQuantity, selected.lowStockLevel ?? 2) }) }} /></label>
            <label>Low-stock threshold<input type="number" min="0" step="1" value={selected.lowStockLevel ?? 2} onChange={(event) => { const lowStockLevel = Number(event.target.value); update({ lowStockLevel, availability: selected.stockQuantity === undefined ? selected.availability : stockAvailability(selected.stockQuantity, lowStockLevel) }) }} /></label>
            <label>Availability<select value={selected.availability} onChange={(event) => update({ availability: event.target.value as ProductAvailability })}>{['Available','Limited','Out of stock','Confirm availability'].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Status<select value={selected.status ?? 'published'} onChange={(event) => update({ status: event.target.value as ProductStatus })}>{['draft','published','archived'].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Image path<input required placeholder="/products/item-name.webp" value={selected.image} onChange={(event) => update({ image: event.target.value })} /></label>
            <label>Weight (optional)<input placeholder="e.g. 24 g" value={selected.weight} onChange={(event) => update({ weight: event.target.value })} /></label>
            <label>Dimensions (optional)<input placeholder="e.g. 42 cm long" value={selected.dimensions} onChange={(event) => update({ dimensions: event.target.value })} /></label>
            <label>Finish<input value={selected.finish} onChange={(event) => update({ finish: event.target.value })} /></label>
            <label>Material<input value={selected.material} onChange={(event) => update({ material: event.target.value })} /></label>
            <label className="wide-field">Colours, comma separated<input value={listValue(selected.colours)} onChange={(event) => update({ colours: parseList(event.target.value) })} /></label>
            <label className="wide-field">Occasions, comma separated<input value={listValue(selected.occasions)} onChange={(event) => update({ occasions: parseList(event.target.value) })} /></label>
            <label className="wide-field">Description<textarea required rows={4} value={selected.note} onChange={(event) => update({ note: event.target.value })} /></label>
            <label className="check-field"><input type="checkbox" checked={selected.featured ?? false} onChange={(event) => update({ featured: event.target.checked })} /> Featured product</label>
          </div>
          <footer><p role="status">{message}</p><button className="admin-primary" type="submit"><Save /> Save catalogue</button></footer>
        </form>}
      </section>
    </div>
  </main>
}