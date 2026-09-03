import { Component, useEffect, useState, type ErrorInfo, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import { ArrowRight, Box, Camera, Check, Copy, Gift, Mail, MapPin, Menu, MessageCircle, Minus, PackageCheck, Phone, Plus, Search, Share2, ShieldCheck, ShoppingBag, Sparkles, Truck, X, ZoomIn } from 'lucide-react'
import logo from './assets/optimized/zenvira-logo.webp'
import heroImage from './assets/optimized/kundan-petal-set.webp'
import { loadProducts } from './catalog/repository'
import { seedProducts } from './catalog/seedProducts'
import type { BagItem, Category, Collection, Product } from './catalog/types'
import './Storefront.css'

type View = 'home' | 'shop' | 'story' | 'care' | 'contact' | 'privacy' | 'terms' | 'shipping' | 'returns'
type SortOption = 'featured' | 'name' | 'category'

const viewPaths: Record<View, string> = {
  home: '/',
  shop: '/shop',
  story: '/story',
  care: '/care',
  contact: '/contact',
  privacy: '/privacy',
  terms: '/terms',
  shipping: '/shipping',
  returns: '/returns',
}

const pathViews = Object.fromEntries(Object.entries(viewPaths).map(([view, path]) => [path, view])) as Record<string, View>
const bagStorageKey = 'zenvira-liora-selection-v1'
const flyerCollections: Array<{ name: Collection; note: string }> = [
  { name: 'AD Jewellery', note: 'Bridal and party wear' },
  { name: 'CZ Collection', note: 'Daily-wear sparkle' },
  { name: '1 Gram Jewellery', note: 'Traditional occasion styles' },
  { name: 'Panchaloham Jewellery', note: 'Classic traditional pieces' },
  { name: 'Mangalsutras', note: 'Traditional and daily wear' },
  { name: 'Anti Tarnish Collection', note: 'Water-resistant daily wear' },
  { name: 'Kids Collection', note: 'Cute, light styles' },
]
const salesEmail = (import.meta.env.VITE_SALES_EMAIL as string | undefined)?.trim() || 'ZenviraLiora@gmail.com'
const whatsappNumber = ((import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? '919642987379').replace(/\D/g, '')
const registeredAddress = (import.meta.env.VITE_REGISTERED_ADDRESS as string | undefined)?.trim() || 'Hyderabad, Telangana, India - 500086'
const instagramHandle = ((import.meta.env.VITE_INSTAGRAM_HANDLE as string | undefined) ?? 'zenviraliora').replace(/^@/, '')
const siteUrl = ((import.meta.env.VITE_SITE_URL as string | undefined) ?? '').trim().replace(/\/$/, '')
const analyticsId = (import.meta.env.VITE_GA_ID as string | undefined)?.trim() ?? ''
const errorEndpoint = (import.meta.env.VITE_ERROR_ENDPOINT as string | undefined)?.trim() ?? ''

const routeFromPath = (path: string) => ({
  view: path.startsWith('/product/') ? 'shop' as View : pathViews[path] ?? 'home',
  sku: path.startsWith('/product/') ? decodeURIComponent(path.split('/').pop() ?? '').toUpperCase() : null,
})

const initialRoute = routeFromPath(window.location.pathname)

const trackEvent = (event: string, details: Record<string, string | number> = {}) => {
  window.dispatchEvent(new CustomEvent('zenvira:analytics', { detail: { event, ...details } }))
  const analyticsWindow = window as Window & { gtag?: (...args: unknown[]) => void }
  analyticsWindow.gtag?.('event', event, details)
}

const productSlug = (product: Product) => product.sku.toLowerCase()
const formatPrice = (price: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price)
const productPrice = (product: Product) => {
  if (product.salePrice && product.price) {
    const discount = Math.round((1 - product.salePrice / product.price) * 100)
    return `${formatPrice(product.salePrice)} (was ${formatPrice(product.price)}, ${discount}% off)`
  }
  return product.price ? formatPrice(product.price) : 'Price confirmed on WhatsApp'
}

class StorefrontErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (!errorEndpoint) return
    void fetch(errorEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message, componentStack: info.componentStack, path: location.pathname }),
    })
  }

  render() {
    if (this.state.failed) return <main className="fatal-error"><img src={logo} alt="Zenvira Liora" /><h1>Something went wrong.</h1><p>Please refresh the page or contact us so we can help with your selection.</p><button className="primary-button" onClick={() => location.reload()}>Refresh page</button></main>
    return this.props.children
  }
}

function StorefrontContent() {
  const [products, setProducts] = useState<Product[]>(seedProducts)
  const [view, setView] = useState<View>(initialRoute.view)
  const [menuOpen, setMenuOpen] = useState(false)
  const [bagOpen, setBagOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(() => seedProducts.find((product) => product.sku === initialRoute.sku) ?? null)
  const [activeImage, setActiveImage] = useState(() => seedProducts.find((product) => product.sku === initialRoute.sku)?.image ?? '')
  const [category, setCategory] = useState<Category>('All')
  const [collection, setCollection] = useState<Collection>('All collections')
  const [query, setQuery] = useState('')
  const [finish, setFinish] = useState('All finishes')
  const [occasion, setOccasion] = useState('All occasions')
  const [sort, setSort] = useState<SortOption>('featured')
  const [imageZoomed, setImageZoomed] = useState(false)
  const [bag, setBag] = useState<BagItem[]>(() => {
    try {
      const saved = localStorage.getItem(bagStorageKey)
      return saved ? JSON.parse(saved) as BagItem[] : []
    } catch {
      return []
    }
  })
  const [requestSent, setRequestSent] = useState(false)
  const [requestText, setRequestText] = useState('')
  const [requestStatus, setRequestStatus] = useState('')
  const [requestedCollection, setRequestedCollection] = useState('')
  const [analyticsConsent, setAnalyticsConsent] = useState<string | null>(() => localStorage.getItem('zenvira-analytics-consent'))

  const categories = [...new Set(products.map((product) => product.category))]
  const collections = [...new Set([...flyerCollections.map((item) => item.name), ...products.map((product) => product.collection)])]
  const finishes = [...new Set(products.map((product) => product.finish))]
  const occasions = [...new Set(products.flatMap((product) => product.occasions))]
  const visibleProducts = products
    .filter((product) => (category === 'All' || product.category === category)
      && (collection === 'All collections' || product.collection === collection)
      && (finish === 'All finishes' || product.finish === finish)
      && (occasion === 'All occasions' || product.occasions.includes(occasion))
      && `${product.name} ${product.sku} ${product.note} ${product.finish} ${product.colours.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
    .sort((first, second) => sort === 'name'
      ? first.name.localeCompare(second.name)
      : sort === 'category'
        ? first.category.localeCompare(second.category) || first.name.localeCompare(second.name)
        : Number(Boolean(second.featured)) - Number(Boolean(first.featured)) || first.id - second.id)
  const bagCount = bag.reduce((total, item) => total + item.quantity, 0)

  useEffect(() => {
    let active = true
    void loadProducts().then((nextProducts) => {
      if (!active) return
      setProducts(nextProducts)
      const route = routeFromPath(window.location.pathname)
      if (!route.sku) return
      const routeProduct = nextProducts.find((product) => product.sku === route.sku) ?? null
      setSelectedProduct(routeProduct)
      setActiveImage(routeProduct?.image ?? '')
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    document.body.style.overflow = bagOpen || selectedProduct || checkoutOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [bagOpen, selectedProduct, checkoutOpen])

  useEffect(() => {
    localStorage.setItem(bagStorageKey, JSON.stringify(bag))
  }, [bag])

  useEffect(() => {
    const handlePopState = () => {
      const route = routeFromPath(window.location.pathname)
      setView(route.view)
      const routeProduct = products.find((product) => product.sku === route.sku) ?? null
      setSelectedProduct(routeProduct)
      setActiveImage(routeProduct?.image ?? '')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [products])

  useEffect(() => {
    const metadata: Record<View, [string, string]> = {
      home: ['Zenvira Liora | Premium Imitation Jewellery', 'Curated premium imitation jewellery for celebrations, gifting, and personal style.'],
      shop: ['Shop the Collection | Zenvira Liora', 'Explore necklaces, bangles, bracelets, and rings from the Zenvira Liora collection.'],
      story: ['Our Story | Zenvira Liora', 'Discover the point of view behind Zenvira Liora Private Limited.'],
      care: ['Jewellery Care | Zenvira Liora', 'Practical guidance for protecting the finish of imitation jewellery.'],
      contact: ['Contact | Zenvira Liora', 'Contact Zenvira Liora about products, availability, and purchase requests.'],
      privacy: ['Privacy Policy | Zenvira Liora', 'How Zenvira Liora handles enquiry and website data.'],
      terms: ['Terms | Zenvira Liora', 'Terms for using the Zenvira Liora website and purchase-request service.'],
      shipping: ['Shipping Policy | Zenvira Liora', 'Shipping information for Zenvira Liora purchases.'],
      returns: ['Returns Policy | Zenvira Liora', 'Returns and exchange information for Zenvira Liora purchases.'],
    }
    const [title, description] = metadata[view]
    document.title = selectedProduct ? `${selectedProduct.name} | Zenvira Liora` : title
    document.querySelector('meta[name="description"]')?.setAttribute('content', selectedProduct?.note ?? description)
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = `${siteUrl || window.location.origin}${window.location.pathname}`
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', selectedProduct ? `${selectedProduct.name} | Zenvira Liora` : title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', selectedProduct?.note ?? description)
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', selectedProduct?.image ?? `${siteUrl || window.location.origin}/social-card.webp`)
    let productSchema = document.querySelector<HTMLScriptElement>('#product-schema')
    if (!selectedProduct) {
      productSchema?.remove()
      return
    }
    if (!productSchema) {
      productSchema = document.createElement('script')
      productSchema.id = 'product-schema'
      productSchema.type = 'application/ld+json'
      document.head.appendChild(productSchema)
    }
    productSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: selectedProduct.name,
      sku: selectedProduct.sku,
      image: selectedProduct.image,
      description: selectedProduct.note,
      material: selectedProduct.material,
      color: selectedProduct.colours.join(', '),
      category: selectedProduct.category,
      brand: { '@type': 'Brand', name: 'Zenvira Liora' },
    })
  }, [view, selectedProduct])

  useEffect(() => {
    if (analyticsConsent !== 'granted' || !analyticsId || document.querySelector('[data-zenvira-analytics]')) return
    const script = document.createElement('script')
    script.async = true
    script.dataset.zenviraAnalytics = 'true'
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`
    document.head.appendChild(script)
    const analyticsWindow = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
    analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? []
    analyticsWindow.gtag = (...args: unknown[]) => analyticsWindow.dataLayer?.push(args)
    analyticsWindow.gtag('js', new Date())
    analyticsWindow.gtag('config', analyticsId, { anonymize_ip: true })
  }, [analyticsConsent])

  useEffect(() => {
    const reportError = (event: ErrorEvent) => {
      if (!errorEndpoint) return
      void fetch(errorEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: event.message, path: location.pathname }) })
    }
    window.addEventListener('error', reportError)
    return () => window.removeEventListener('error', reportError)
  }, [])

  useEffect(() => {
    const dialog = [...document.querySelectorAll<HTMLElement>('[aria-modal="true"]')].at(-1)
    if (!dialog) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>(focusableSelector)]
    queueMicrotask(() => focusable()[0]?.focus())
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (checkoutOpen) { setCheckoutOpen(false); setRequestSent(false) }
        else if (selectedProduct) closeProduct()
        else setBagOpen(false)
      }
      if (event.key === 'Tab') {
        const controls = focusable()
        if (!controls.length) return
        const first = controls[0]
        const last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown); previouslyFocused?.focus() }
  }, [bagOpen, checkoutOpen, selectedProduct])

  const navigate = (nextView: View) => {
    setView(nextView)
    setMenuOpen(false)
    if (window.location.pathname !== viewPaths[nextView]) window.history.pushState({}, '', viewPaths[nextView])
    window.scrollTo({ top: 0, behavior: 'smooth' })
    trackEvent('page_view', { page: nextView })
  }

  const followRoute = (event: MouseEvent<HTMLAnchorElement>, nextView: View) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(nextView)
  }

  const openProduct = (product: Product) => {
    setSelectedProduct(product)
    setActiveImage(product.image)
    setImageZoomed(false)
    window.history.pushState({}, '', `/product/${productSlug(product)}`)
    trackEvent('view_product', { sku: product.sku })
  }

  function closeProduct() {
    setSelectedProduct(null)
    setActiveImage('')
    setImageZoomed(false)
    window.history.replaceState({}, '', viewPaths.shop)
  }

  const addToBag = (product: Product) => {
    if (product.availability === 'Out of stock') return
    setRequestedCollection('')
    setBag((current) => {
      const existing = current.find((item) => item.product.id === product.id)
      return existing ? current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { product, quantity: 1 }]
    })
    setSelectedProduct(null)
    setBagOpen(true)
    trackEvent('add_to_selection', { sku: product.sku })
  }

  const changeQuantity = (id: number, amount: number) => setBag((current) => current.map((item) => item.product.id === id ? { ...item, quantity: item.quantity + amount } : item).filter((item) => item.quantity > 0))
  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const selectedItems = bag.map(({ product, quantity }) => `${product.sku} - ${product.name} x${quantity}`).join('\n')
    const selection = [selectedItems, requestedCollection ? `Source request: ${requestedCollection}` : ''].filter(Boolean).join('\n') || 'General jewellery enquiry'
    const preparedRequest = `Zenvira Liora purchase request\n\n${selection}\n\nName: ${data.get('name')}\nMobile: ${data.get('mobile')}\nEmail: ${data.get('email') || 'Not provided'}\nPreferred contact: ${data.get('preferred-contact')}\nOccasion: ${data.get('occasion') || 'Not provided'}\nRequired by: ${data.get('required-by') || 'Not provided'}\nBudget: ${data.get('budget') || 'Not provided'}\nGift box: ${data.get('gift-box') ? 'Yes' : 'No'}\nNotes: ${data.get('notes') || 'None'}`
    setRequestText(preparedRequest)
    setRequestStatus('Sending request…')
    const payload = new URLSearchParams()
    data.forEach((value, key) => payload.append(key, String(value)))
    payload.set('form-name', 'purchase-request')
    payload.set('selection', selection)
    try {
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        await navigator.clipboard.writeText(preparedRequest)
        setRequestStatus('Preview prepared and copied. Netlify will receive this form after deployment.')
      } else {
        const response = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: payload.toString() })
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
        setRequestStatus('Your request has been received. We will confirm availability and commercial details before purchase.')
      }
      form.reset()
      setRequestSent(true)
      trackEvent('purchase_request_sent', { pieces: bagCount })
    } catch {
      setRequestStatus('Automatic delivery was unavailable. Copy the request or continue through your preferred contact channel.')
      setRequestSent(true)
      trackEvent('purchase_request_error')
    }
  }

  const copyRequest = async () => {
    await navigator.clipboard.writeText(requestText)
    setRequestStatus('Request copied to your clipboard.')
  }

  const shareRequest = async () => {
    if (navigator.share) await navigator.share({ title: 'Zenvira Liora purchase request', text: requestText })
    else await copyRequest()
  }

  const setConsent = (value: 'granted' | 'denied') => {
    localStorage.setItem('zenvira-analytics-consent', value)
    setAnalyticsConsent(value)
  }

  const requestSource = (collectionName: string) => {
    setRequestedCollection(collectionName)
    setRequestSent(false)
    setCheckoutOpen(true)
    trackEvent('source_request_started', { collection: collectionName })
  }

  return <div className="site-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="announcement"><Sparkles /> New arrivals every week · Pan-India delivery available <Sparkles /></div>
    <header className="site-header">
      <button className="icon-button menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      <a className="brand" href={viewPaths.home} aria-label="Zenvira Liora home" onClick={(event) => followRoute(event, 'home')}><img src={logo} alt="" /><span><strong>Zenvira Liora</strong><small>Elegance redefined</small></span></a>
      <nav className={menuOpen ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">
        <a className={view === 'home' ? 'active' : ''} href={viewPaths.home} onClick={(event) => followRoute(event, 'home')}>Home</a>
        <a className={view === 'shop' ? 'active' : ''} href={viewPaths.shop} onClick={(event) => followRoute(event, 'shop')}>Shop</a>
        <a className={view === 'story' ? 'active' : ''} href={viewPaths.story} onClick={(event) => followRoute(event, 'story')}>Our story</a>
        <a className={view === 'care' ? 'active' : ''} href={viewPaths.care} onClick={(event) => followRoute(event, 'care')}>Jewellery care</a>
        <a className={view === 'contact' ? 'active' : ''} href={viewPaths.contact} onClick={(event) => followRoute(event, 'contact')}>Contact</a>
      </nav>
      <button className="bag-button" aria-label={`Open selection bag with ${bagCount} items`} onClick={() => setBagOpen(true)}><ShoppingBag /><span>Bag</span><b>{bagCount}</b></button>
    </header>

    <main id="main-content">
      {view === 'home' && <>
        <section className="hero-section"><img src={heroImage} alt="Model wearing a traditional necklace set" fetchPriority="high" /><div className="hero-overlay" /><div className="hero-copy"><p className="eyebrow">The occasion edit</p><h1>Adorn the<br />moment.</h1><p>Expressive imitation jewellery, curated to bring polish and presence to every celebration.</p><button className="primary-button" onClick={() => navigate('shop')}>Explore the collection <ArrowRight /></button></div><p className="hero-index">ZL · 01</p></section>
        <section className="category-strip" aria-label="Shop by category">{categories.map((item) => <button key={item} onClick={() => { setCategory(item); navigate('shop') }}><span>{item}</span><ArrowRight /></button>)}</section>
        <section className="trust-strip" aria-label="Why shop with Zenvira Liora"><article><PackageCheck /><span>Premium quality</span></article><article><Gift /><span>Gift boxes available</span></article><article><Sparkles /><span>Weekly new arrivals</span></article><article><Box /><span>Secure packaging</span></article><article><Truck /><span>Pan-India delivery</span></article></section>
        <section className="editorial-section"><div className="editorial-heading"><p className="eyebrow">Objects of affection</p><h2>Made to be noticed.<br />Chosen to be yours.</h2></div><div className="featured-grid">{products.filter((product) => product.featured).map((product, index) => <article className={`featured-card featured-${index + 1}`} key={product.id}><button onClick={() => openProduct(product)}><img src={product.image} alt={product.name} loading="lazy" decoding="async" /><span>{product.badge ?? `0${index + 1}`}</span></button><div><small>{product.category}</small><h3>{product.name}</h3><p>{product.finish}</p></div></article>)}</div></section>
        <section className="brand-statement"><img src={logo} alt="Zenvira Liora" loading="lazy" /><div><p className="eyebrow">The Zenvira Liora point of view</p><h2>Affordable luxury for every occasion.</h2><p>Handpicked fashion jewellery for everyday elegance, celebrations, gifting, and special occasions, supported by secure packaging and Pan-India delivery.</p><button className="text-button" onClick={() => navigate('story')}>Discover our story <ArrowRight /></button></div></section>
      </>}

      {view === 'shop' && <section className="shop-page">
        <header className="page-heading"><p className="eyebrow">The collection</p><h1>Find your finishing touch.</h1><p>Browse the current edit and build a selection bag. Availability, sizing, and prices are confirmed personally before purchase.</p></header>
        <div className="shop-tools"><div className="category-tabs">{['All', ...categories].map((item) => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="search-field"><Search /><span className="sr-only">Search collection</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU or colour" /></label></div>
        <div className="filter-row"><label>Collection<select value={collection} onChange={(event) => setCollection(event.target.value)}><option>All collections</option>{collections.map((item) => <option key={item}>{item}</option>)}</select></label><label>Finish<select value={finish} onChange={(event) => setFinish(event.target.value)}><option>All finishes</option>{finishes.map((item) => <option key={item}>{item}</option>)}</select></label><label>Occasion<select value={occasion} onChange={(event) => setOccasion(event.target.value)}><option>All occasions</option>{occasions.map((item) => <option key={item}>{item}</option>)}</select></label><label>Sort by<select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}><option value="featured">Featured</option><option value="name">Name</option><option value="category">Category</option></select></label><p>{visibleProducts.length} pieces</p></div>
        <div className="product-grid">{visibleProducts.map((product) => <article className="product-card" key={product.id}><button className="product-image" onClick={() => openProduct(product)}><img src={product.image} alt={product.name} loading="lazy" decoding="async" />{product.badge && <span>{product.badge}</span>}<i>Quick view</i></button><div className="product-info"><small>{product.sku} · {product.collection}</small><h2>{product.name}</h2><p>{productPrice(product)} · {product.availability}</p><button onClick={() => addToBag(product)}>Add to selection <Plus /></button></div></article>)}</div>
        {visibleProducts.length === 0 && <div className="empty-state"><Search /><h2>No listed pieces found</h2><p>Ask us to source this collection, or try another filter.</p><button className="primary-button" onClick={() => requestSource(collection === 'All collections' ? 'A custom jewellery piece' : collection)}>Request sourcing <ArrowRight /></button></div>}
        <section className="source-collections"><header><p className="eyebrow">Our flyer collections</p><h2>Can’t see it? We source on request.</h2></header><div>{flyerCollections.map((item) => <article key={item.name}><span>{item.name}</span><p>{item.note}</p><button aria-label={`Request ${item.name}`} onClick={() => requestSource(item.name)}><ArrowRight /></button></article>)}</div></section>
      </section>}

      {view === 'story' && <section className="story-page"><div className="story-mark"><img src={logo} alt="Zenvira Liora" /></div><div className="story-copy"><p className="eyebrow">Zenvira Liora · Elegance redefined</p><h1>Jewellery should feel like you.</h1><p className="story-lead">Handpicked fashion jewellery for everyday elegance, celebrations, gifting, and special occasions, with styles for weddings, festivals, daily and office wear, parties, gifts, and every you.</p><div className="story-values"><div><span>01</span><h2>Affordable luxury</h2><p>Premium-quality pieces chosen to bring polish and presence within reach.</p></div><div><span>02</span><h2>Handpicked designs</h2><p>AD, CZ, one-gram, Panchaloham, Mangalsutra, anti-tarnish, and kids collections, with sourcing available on request.</p></div><div><span>03</span><h2>Thoughtful service</h2><p>New arrivals every week, gift boxes, secure packaging, WhatsApp support, and Pan-India delivery.</p></div></div><button className="primary-button" onClick={() => navigate('shop')}>View the collection <ArrowRight /></button></div></section>}

      {view === 'care' && <section className="care-page"><header><p className="eyebrow">Jewellery care</p><h1>Keep the glow,<br />wear after wear.</h1><p>Imitation jewellery responds best to gentle handling and dry storage. These simple habits help preserve its finish.</p></header><div className="care-list">{[['01','Last on, first off','Wear jewellery after perfume, lotion, and makeup have dried. Remove it before changing clothes.'],['02','Keep it dry','Avoid water, sweat, sprays, and household chemicals. Remove pieces before bathing or exercise.'],['03','Store separately','Use a soft pouch or lined box for each piece to reduce friction, tangling, and surface marks.'],['04','Wipe gently','After wear, use a clean, dry, soft cloth. Do not use abrasive cleaners or metal polish.']].map(([number,title,text]) => <article key={number}><span>{number}</span><div><h2>{title}</h2><p>{text}</p></div></article>)}</div><aside><ShieldCheck /><p><strong>Finish and wear vary by piece.</strong> Ask for product-specific care guidance before completing your purchase.</p></aside></section>}

      {view === 'contact' && <section className="info-page contact-page"><header><p className="eyebrow">Contact</p><h1>Let’s find your piece.</h1><p>Ask about availability, sizing, finish, styling, sourcing, and final pricing. Commercial details are confirmed before payment.</p></header><div className="contact-grid"><article><MessageCircle /><h2>WhatsApp</h2><a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">+91 96429 87379</a><a className="contact-card-qr" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer"><img src="/branded-whatsapp-qr.png" alt="QR code to contact Zenvira Liora on WhatsApp" /><span>Scan to shop</span></a></article><article><Camera /><h2>Instagram</h2><a href={`https://instagram.com/${instagramHandle}`} target="_blank" rel="noreferrer">@{instagramHandle}</a><a className="contact-card-qr" href={`https://instagram.com/${instagramHandle}`} target="_blank" rel="noreferrer"><img src="/branded-instagram-qr.jpg" alt="QR code to follow Zenvira Liora on Instagram" /><span>Scan to follow</span></a></article><article><MapPin /><h2>Location</h2><p>{registeredAddress}</p></article><article><Phone /><h2>Purchase requests</h2><p>Add pieces to your bag and send one complete request.{salesEmail && <> Email support: <a href={`mailto:${salesEmail}`}>{salesEmail}</a>.</>}</p><button className="text-button" onClick={() => setBagOpen(true)}>Open selection bag <ArrowRight /></button></article></div></section>}

      {view === 'privacy' && <section className="info-page policy-page"><header><p className="eyebrow">Privacy policy · Updated 30 August 2026</p><h1>Your information, handled thoughtfully.</h1></header><article><h2>Information we collect</h2><p>When you send a purchase request, we collect the contact details, preferences, notes, and selected products that you provide. We use this information only to respond to your enquiry and support the requested transaction.</p><h2>Storage and service providers</h2><p>Website requests may be processed by our hosting and form-delivery providers. We retain enquiry records only as long as needed for customer service, legal, accounting, and fraud-prevention purposes.</p><h2>Analytics and your choices</h2><p>Optional analytics load only after you accept measurement. You can decline without losing storefront functionality. We do not sell personal information.</p><h2>Your rights</h2><p>You may request access, correction, or deletion of your enquiry information through the verified contact details published on this website.</p></article></section>}

      {view === 'terms' && <section className="info-page policy-page"><header><p className="eyebrow">Website terms · Updated 30 August 2026</p><h1>Clear expectations before purchase.</h1></header><article><h2>Catalogue information</h2><p>Product photographs, colours, dimensions, descriptions, prices, and availability are indicative until confirmed in writing. Screen settings and handcrafted or batch variations may affect appearance.</p><h2>Purchase requests</h2><p>Submitting a selection is an enquiry, not an accepted order or payment. A purchase becomes binding only after both parties confirm the final product, price, delivery terms, and payment.</p><h2>Responsible use</h2><p>Do not misuse this website, attempt unauthorized access, or submit unlawful or misleading information. Website content and branding may not be reproduced without permission.</p><h2>Liability</h2><p>Nothing in these terms limits rights that cannot legally be excluded. Verified terms supplied with a confirmed purchase take precedence over general catalogue information.</p></article></section>}

      {view === 'shipping' && <section className="info-page policy-page"><header><p className="eyebrow">Shipping policy</p><h1>Securely packed, delivered across India.</h1></header><article><h2>Pan-India delivery</h2><p>Pan-India delivery is available. Destination serviceability, dispatch estimate, carrier, and applicable charges are confirmed with the customer before payment.</p><h2>Secure packaging and tracking</h2><p>Every confirmed order is quality checked and securely packaged before dispatch. Tracking details are shared when supported by the selected carrier.</p><h2>Delivery inspection</h2><p>Inspect the package promptly. Report a damaged, defective, incorrect, or missing item through WhatsApp within 48 hours of delivery with clear photographs, packaging photographs, and the order reference.</p></article></section>}

      {view === 'returns' && <section className="info-page policy-page"><header><p className="eyebrow">Returns and exchange policy</p><h1>Quality checked before dispatch.</h1></header><article><h2>Returns after delivery</h2><p>Returns are not accepted after delivery due to hygiene requirements. Please confirm product details, size, finish, price, and delivery terms before completing payment.</p><h2>Damaged or defective products</h2><p>If you receive a damaged or defective product, inform us on WhatsApp within 48 hours of delivery and provide the order reference and clear photographs of the item and packaging.</p><h2>Case review</h2><p>Keep the product unused and retain its original packaging while the report is reviewed. The available resolution is communicated after the photographs and order details have been verified.</p></article></section>}
    </main>

    <footer><div><a className="footer-brand" href={viewPaths.home} onClick={(event) => followRoute(event, 'home')}><img src={logo} alt="" /><span>Zenvira Liora</span></a><p>Premium imitation jewellery<br />by Zenvira Liora Private Limited</p></div><nav aria-label="Footer navigation"><a href={viewPaths.shop} onClick={(event) => followRoute(event, 'shop')}>Collection</a><a href={viewPaths.story} onClick={(event) => followRoute(event, 'story')}>Our story</a><a href={viewPaths.care} onClick={(event) => followRoute(event, 'care')}>Care</a><a href={viewPaths.contact} onClick={(event) => followRoute(event, 'contact')}>Contact</a><a href={viewPaths.privacy} onClick={(event) => followRoute(event, 'privacy')}>Privacy</a><a href={viewPaths.terms} onClick={(event) => followRoute(event, 'terms')}>Terms</a><a href={viewPaths.shipping} onClick={(event) => followRoute(event, 'shipping')}>Shipping</a><a href={viewPaths.returns} onClick={(event) => followRoute(event, 'returns')}>Returns</a></nav><p>Product availability and commercial terms are confirmed before purchase.</p></footer>

    <button className="whatsapp-fab" aria-label={whatsappNumber ? 'Chat with Zenvira Liora on WhatsApp' : 'View WhatsApp contact information'} onClick={() => whatsappNumber ? window.open(`https://wa.me/${whatsappNumber}`, '_blank', 'noopener,noreferrer') : navigate('contact')}><MessageCircle /><span>WhatsApp</span></button>

    {selectedProduct && <div className="modal-layer" onMouseDown={closeProduct}><section className="quick-view" role="dialog" aria-modal="true" aria-labelledby="quick-title" onMouseDown={(event) => event.stopPropagation()}><button className="close-button" aria-label="Close product details" onClick={closeProduct}><X /></button><div className={`quick-image ${imageZoomed ? 'zoomed' : ''}`}><button aria-label={imageZoomed ? 'Show full product image' : 'Zoom product image'} onClick={() => setImageZoomed((current) => !current)}><img src={activeImage || selectedProduct.image} alt={selectedProduct.name} /><ZoomIn /></button>{selectedProduct.images?.length ? <div className="image-thumbnails">{[selectedProduct.image, ...selectedProduct.images].map((image, index) => <button className={image === activeImage ? 'active' : ''} key={image} aria-label={`View image ${index + 1} of ${selectedProduct.name}`} onClick={() => setActiveImage(image)}><img src={image} alt="" /></button>)}</div> : <p>Additional product photographs available on request</p>}</div><div className="quick-copy"><p className="eyebrow">{selectedProduct.sku} · {selectedProduct.collection}</p><h2 id="quick-title">{selectedProduct.name}</h2><p>{selectedProduct.note}</p><dl><div><dt>Finish</dt><dd>{selectedProduct.finish}</dd></div><div><dt>Material</dt><dd>{selectedProduct.material}</dd></div><div><dt>Size</dt><dd>{selectedProduct.dimensions}</dd></div><div><dt>Weight</dt><dd>{selectedProduct.weight}</dd></div><div><dt>Colours shown</dt><dd>{selectedProduct.colours.join(', ')}</dd></div><div><dt>Price</dt><dd>{productPrice(selectedProduct)}</dd></div><div><dt>Availability</dt><dd>{selectedProduct.availability}</dd></div></dl><p className="specification-note">Product composition, measurements, weight, colour, price, and stock are confirmed before purchase.</p><div className="quick-actions"><button className="primary-button" onClick={() => addToBag(selectedProduct)}>Add to selection <ShoppingBag /></button><button className="icon-action" aria-label="Share product" onClick={() => void navigator.share?.({ title: selectedProduct.name, text: selectedProduct.note, url: location.href })}><Share2 /></button></div></div></section></div>}

    {bagOpen && <div className="drawer-layer"><button className="drawer-backdrop" aria-label="Close selection bag" onClick={() => setBagOpen(false)} /><aside className="bag-drawer" role="dialog" aria-modal="true" aria-labelledby="bag-title"><header><div><p className="eyebrow">Your edit</p><h2 id="bag-title">Selection bag <span>{bagCount}</span></h2></div><button className="close-button" aria-label="Close selection bag" onClick={() => setBagOpen(false)}><X /></button></header>{bag.length === 0 ? <div className="bag-empty"><ShoppingBag /><h3>Your bag is waiting.</h3><p>Add pieces from the collection to prepare a personal purchase request.</p><button className="primary-button" onClick={() => { setBagOpen(false); navigate('shop') }}>Explore collection <ArrowRight /></button></div> : <><div className="bag-items">{bag.map(({ product, quantity }) => <article key={product.id}><img src={product.image} alt="" /><div><small>{product.sku} · {product.category}</small><h3>{product.name}</h3><p>{productPrice(product)}</p><div className="quantity"><button aria-label={`Remove one ${product.name}`} onClick={() => changeQuantity(product.id, -1)}><Minus /></button><span>{quantity}</span><button aria-label={`Add one ${product.name}`} onClick={() => changeQuantity(product.id, 1)}><Plus /></button></div></div><button className="remove-item" aria-label={`Remove ${product.name}`} onClick={() => setBag((current) => current.filter((item) => item.product.id !== product.id))}><X /></button></article>)}</div><div className="bag-footer"><p><span>Selected pieces</span><strong>{bagCount}</strong></p><small>No payment is taken on this website. Prices and availability are confirmed personally.</small><button className="primary-button" onClick={() => { setRequestedCollection(''); setBagOpen(false); setCheckoutOpen(true); setRequestSent(false) }}>Continue to request <ArrowRight /></button></div></>}</aside></div>}

    {checkoutOpen && <div className="modal-layer"><section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><button className="close-button" aria-label="Close purchase request" onClick={() => { setCheckoutOpen(false); setRequestSent(false) }}><X /></button>{requestSent ? <div className="request-success"><span><Check /></span><p className="eyebrow">Request update</p><h2 id="checkout-title">Thank you for your interest.</h2><p>{requestStatus}</p><div className="request-actions"><button className="secondary-button" onClick={() => void copyRequest()}><Copy /> Copy request</button><button className="secondary-button" onClick={() => void shareRequest()}><Share2 /> Share</button>{whatsappNumber && <a className="primary-button" href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(requestText)}`} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>}{salesEmail && <a className="secondary-button" href={`mailto:${salesEmail}?subject=${encodeURIComponent('Zenvira Liora purchase request')}&body=${encodeURIComponent(requestText)}`}><Mail /> Email</a>}</div><a className="text-button" href={viewPaths.shop} onClick={(event) => { setCheckoutOpen(false); setRequestSent(false); followRoute(event, 'shop') }}>Return to collection <ArrowRight /></a></div> : <><header><p className="eyebrow">{requestedCollection ? 'Source request' : 'Purchase request'}</p><h2 id="checkout-title">{requestedCollection ? `Source ${requestedCollection}.` : 'Let’s confirm your selection.'}</h2><p>Share your details so availability, size, finish, and final pricing can be confirmed before payment.</p></header><form name="purchase-request" data-netlify="true" netlify-honeypot="bot-field" onSubmit={submitRequest}><input type="hidden" name="form-name" value="purchase-request" /><input type="hidden" name="selection" value={[bag.map(({ product, quantity }) => `${product.sku} x${quantity}`).join(', '), requestedCollection ? `Source: ${requestedCollection}` : ''].filter(Boolean).join('; ')} /><label className="bot-field">Leave this empty<input name="bot-field" autoComplete="off" tabIndex={-1} /></label><label>Full name<input name="name" required autoComplete="name" /></label><label>Mobile number<input name="mobile" required type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+() ]{7,20}" /></label><label>Email <span>Optional</span><input name="email" type="email" autoComplete="email" /></label><label>Preferred contact<select name="preferred-contact" defaultValue="" required><option value="" disabled>Select a channel</option><option>Phone call</option><option>WhatsApp</option><option>Email</option></select></label><label>Occasion<input name="occasion" placeholder="Wedding, gifting, daily wear…" /></label><label>Required by <span>Optional</span><input name="required-by" type="date" /></label><label>Budget range <span>Optional</span><input name="budget" placeholder="Your preferred range" /></label><label className="checkbox-field"><input name="gift-box" type="checkbox" /><span>Gift box required</span></label><label className="full-field">Source request or notes <span>Optional</span><textarea name="notes" rows={3} maxLength={600} placeholder="Mention a collection, size, colour, or product you would like us to source." /></label><label className="request-consent full-field"><input name="consent" type="checkbox" required /><span>I agree to be contacted about this selection and have read the <button type="button" onClick={() => { setCheckoutOpen(false); navigate('privacy') }}>Privacy Policy</button>. I understand this is not a confirmed order or payment.</span></label><button className="primary-button full-field" type="submit">Send purchase request <ArrowRight /></button></form></>}</section></div>}

    {analyticsConsent === null && <aside className="consent-banner" aria-label="Analytics preference"><p><strong>Optional site measurement</strong><span>Anonymous interaction data helps improve the collection. It loads only with your permission.</span></p><div><button onClick={() => setConsent('denied')}>Decline</button><button className="primary-button" onClick={() => setConsent('granted')}>Allow</button></div></aside>}
  </div>
}

function Storefront() {
  return <StorefrontErrorBoundary><StorefrontContent /></StorefrontErrorBoundary>
}

export default Storefront
