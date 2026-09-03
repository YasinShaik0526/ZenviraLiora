import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  X,
  Download,
} from "lucide-react";
import { jsPDF } from "jspdf";
import productsData from "../content/products.json";
import type { BagItem, Product } from "./catalog/types";
import "./Storefront.css";

const products = productsData as Product[];
const gstRate = 0.03;
const sellerGstin = "36AADCZ0700G1ZO";
const bagKey = "zenvira-sales-bag-v1";
const createReference = (prefix: string) => `${prefix}-${Date.now().toString().slice(-8)}`;
const productImages = (item: Product) => [item.image, ...(item.images ?? [])].filter((image, index, all) => image && all.indexOf(image) === index);
const productFromPath = () => { const sku = window.location.pathname.match(/^\/product\/([^/]+)/)?.[1]?.toUpperCase(); return products.find((item) => item.sku === sku) ?? null; };
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
type Order = { id: string; invoice: string; name: string; phone: string; email: string; address: string; payment: string; items: BagItem[]; subtotal: number; gst: number; delivery: number; total: number; date: string };

function Storefront() {
  const [bag, setBag] = useState<BagItem[]>(
    () => JSON.parse(localStorage.getItem(bagKey) ?? "[]") as BagItem[],
  );
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [bagOpen, setBagOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [product, setProduct] = useState<Product | null>(() => productFromPath());
  const [activeImage, setActiveImage] = useState("");
  const [cardImageIndexes, setCardImageIndexes] = useState<Record<number, number>>({});
  const galleryImages = useMemo(() => product ? productImages(product) : [], [product]);
  const [order, setOrder] = useState<Order | null>(null);
  const [emailStatus, setEmailStatus] = useState('');

  useEffect(() => localStorage.setItem(bagKey, JSON.stringify(bag)), [bag]);
  const categories = useMemo(
    () => ["All", ...new Set(products.map((item) => item.category))],
    [],
  );
  const filteredProducts = useMemo(
    () =>
      products.filter(
        (item) =>
          (category === "All" || item.category === category) &&
          `${item.name} ${item.collection} ${item.colours.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [category, query],
  );
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCardImageIndexes((current) => Object.fromEntries(products.map((item) => { const images = productImages(item); return [item.id, images.length > 1 ? ((current[item.id] ?? 0) + 1) % images.length : 0]; })));
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);
  const itemCount = bag.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = bag.reduce(
    (sum, item) =>
      sum + (item.product.salePrice ?? item.product.price ?? 0) * item.quantity,
    0,
  );
  const delivery = subtotal ? 99 : 0;
  const gst = Math.round(subtotal * gstRate);
  const total = subtotal + delivery + gst;

  const addToBag = (item: Product) => {
    setBag((current) => {
      const found = current.find((entry) => entry.product.id === item.id);
      return found
        ? current.map((entry) =>
            entry.product.id === item.id
              ? { ...entry, quantity: entry.quantity + 1 }
              : entry,
          )
        : [...current, { product: item, quantity: 1 }];
    });
    setProduct(null);
    if (window.location.pathname.startsWith("/product/")) window.history.replaceState({}, "", "/shop");
  };
  const openProductPage = (item: Product) => { setProduct(item); setActiveImage(item.image); window.history.pushState({}, "", `/product/${item.sku.toLowerCase()}`); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const closeProductPage = () => { setProduct(null); window.history.pushState({}, "", "/shop"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  useEffect(() => { const handlePopState = () => setProduct(productFromPath()); window.addEventListener("popstate", handlePopState); return () => window.removeEventListener("popstate", handlePopState); }, []);
  useEffect(() => {
    if (!product || galleryImages.length < 2) return
    const timer = window.setInterval(() => {
      setActiveImage((current) => {
        const currentIndex = galleryImages.indexOf(current)
        return galleryImages[(currentIndex + 1) % galleryImages.length]
      })
    }, 5000)
    return () => window.clearInterval(timer)
  }, [product, galleryImages])
  const moveImage = (direction: number) => {
    if (!galleryImages.length) return
    const currentIndex = Math.max(0, galleryImages.indexOf(activeImage))
    setActiveImage(galleryImages[(currentIndex + direction + galleryImages.length) % galleryImages.length])
  }
  const updateQuantity = (id: number, amount: number) =>
    setBag((current) =>
      current
        .map((item) =>
          item.product.id === id
            ? { ...item, quantity: item.quantity + amount }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  const placeOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const id = createReference("ZL");
    const nextOrder = {
      id,
      invoice: `ZLI-${new Date().getFullYear()}-${createReference("INV").slice(-6)}`,
      name: String(data.get("name")),
      phone: String(data.get("phone")),
      email: String(data.get("email")),
      address: `${data.get("address")}, ${data.get("city")} - ${data.get("pincode")}`,
      payment: String(data.get("payment")),
      items: [...bag],
      subtotal,
      gst,
      delivery,
      total,
      date: new Date().toISOString(),
    };
    setOrder(nextOrder);
    void sendOrderEmails(nextOrder);
    setBag([]);
    setCheckoutOpen(false);
    event.currentTarget.reset();
  };
  const sendOrderEmails = async (nextOrder: Order) => {
    const response = await fetch('/.netlify/functions/send-order-confirmation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nextOrder) }).catch(() => null);
    setEmailStatus(response?.ok ? 'Confirmation emails sent to the store and customer.' : 'Order confirmed. Email delivery will be available after the email service is configured.');
  };
  const moveCardImage = (item: Product, direction: number) => { const images = productImages(item); if (images.length < 2) return; setCardImageIndexes((current) => ({ ...current, [item.id]: ((current[item.id] ?? 0) + direction + images.length) % images.length })); };
  const downloadInvoice = () => {
    if (!order) return;
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const right = pageWidth - 18;
    const invoiceMoney = (value: number) => `INR ${value.toLocaleString("en-IN")}`;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("ZENVIRA LIORA", 18, 24);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("Premium imitation jewellery", 18, 31);
    pdf.text(`GSTIN: ${sellerGstin}`, 18, 37);
    pdf.text("GST TAX INVOICE", right, 24, { align: "right" });
    pdf.text(`Invoice: ${order.invoice}`, right, 32, { align: "right" });
    pdf.text(`Order: ${order.id}`, right, 38, { align: "right" });
    pdf.text(`Date: ${new Date(order.date).toLocaleDateString("en-IN")}`, right, 44, { align: "right" });
    pdf.line(18, 50, right, 50);
    pdf.setFont("helvetica", "bold");
    pdf.text("Customer", 18, 62);
    pdf.setFont("helvetica", "normal");
    pdf.text(order.name, 18, 69); pdf.text(order.phone, 18, 76); pdf.text(order.email, 18, 83); pdf.text(order.address, 18, 90, { maxWidth: 95 });
    pdf.setFont("helvetica", "bold"); pdf.text("Payment", 150, 69); pdf.setFont("helvetica", "normal"); pdf.text(order.payment, right, 69, { align: "right" });
    pdf.setFont("helvetica", "normal");
    let y = 112; pdf.setFillColor(243, 237, 231); pdf.rect(18, y - 7, right - 18, 12, "F"); pdf.setFont("helvetica", "bold"); pdf.text("Item", 21, y); pdf.text("Details", 95, y); pdf.text("Amount", right, y, { align: "right" }); pdf.setFont("helvetica", "normal"); y += 14;
    order.items.forEach(({ product: item, quantity }) => { pdf.text(`${item.name} x${quantity}`, 21, y); pdf.text(item.finish, 95, y); pdf.text(invoiceMoney((item.salePrice ?? item.price ?? 0) * quantity), right, y, { align: "right" }); pdf.setDrawColor(220, 210, 202); pdf.line(18, y + 5, right, y + 5); y += 14; });
    y += 8; pdf.text("Taxable subtotal", 130, y, { align: "right" }); pdf.text(invoiceMoney(order.subtotal), right, y, { align: "right" }); y += 10; pdf.text(`GST (${gstRate * 100}%)`, 130, y, { align: "right" }); pdf.text(invoiceMoney(order.gst), right, y, { align: "right" }); y += 10; pdf.text("Delivery", 130, y, { align: "right" }); pdf.text(invoiceMoney(order.delivery), right, y, { align: "right" }); y += 10; pdf.setFont("helvetica", "bold"); pdf.text("Total", 130, y, { align: "right" }); pdf.text(invoiceMoney(order.total), right, y, { align: "right" }); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.text("Currency: INR (Indian Rupees)", 18, 252); pdf.text("Thank you for shopping with Zenvira Liora.", 18, 260); pdf.text(`GSTIN: ${sellerGstin}`, 18, 268);
    pdf.save(`GST-Invoice-${order.invoice}.pdf`);
  };

  return (
    <div className="sales-shell">
      <div className="announcement">
        NEW ARRIVALS · PAN-INDIA DELIVERY · GST INVOICE AVAILABLE
      </div>
      <header className="sales-header">
        <a className="sales-logo" href="#top">
          <span>ZL</span>
          <strong>Zenvira Liora</strong>
          <small>Elegance redefined</small>
        </a>
        <nav>
          <a href="#shop">Shop</a>
          <a href="#story">Our story</a>
          <a href="#care">Care</a>
        </nav>
        <button
          className="bag-trigger"
          onClick={() => setBagOpen(true)}
          aria-label={`Open shopping bag with ${itemCount} items`}
        >
          <ShoppingBag /> Bag <b>{itemCount}</b>
        </button>
      </header>
      <main id="top">
        <section className="sales-hero">
          <div>
            <p className="eyebrow">Adornment for every moment</p>
            <h1>
              Make a little
              <br />
              <em>more magic.</em>
            </h1>
            <p>
              Expressive imitation jewellery, thoughtfully chosen for
              celebrations, gifting, and everyday shine.
            </p>
            <a className="primary-button" href="#shop">
              Shop the collection <ArrowRight />
            </a>
          </div>
          <img
            src="/products/kundan-petal-set.webp"
            alt="Kundan Petal Set jewellery"
          />
        </section>
        <section className="sales-benefits">
          <span>PREMIUM FINISHES</span>
          <span>GIFT-READY PACKAGING</span>
          <span>SECURE CHECKOUT</span>
          <span>GST INVOICE</span>
        </section>
        <section className="collection" id="shop">
          <div className="section-title">
            <div>
              <p className="eyebrow">The latest edit</p>
              <h2>
                Find your
                <br />
                <em>finishing touch.</em>
              </h2>
            </div>
            <label className="search">
              <span>⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search jewellery"
              />
            </label>
          </div>
          <div className="category-tabs">
            {categories.map((item) => (
              <button
                className={category === item ? "active" : ""}
                key={item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="sales-grid">
            {filteredProducts.map((item) => (
              <article className="sales-card" key={item.id}>
                <div className="card-image" role="button" tabIndex={0} onClick={() => openProductPage(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openProductPage(item); }}>
                  <img src={productImages(item)[cardImageIndexes[item.id] ?? 0]} alt={item.name} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = item.image; }} />
                  {productImages(item).length > 1 && <><span className="card-image-count">{(cardImageIndexes[item.id] ?? 0) + 1} / {productImages(item).length}</span><span className="card-image-controls"><button type="button" aria-label={`Previous image of ${item.name}`} onClick={(event) => { event.stopPropagation(); moveCardImage(item, -1); }}><ChevronLeft /></button><button type="button" aria-label={`Next image of ${item.name}`} onClick={(event) => { event.stopPropagation(); moveCardImage(item, 1); }}><ChevronRight /></button></span></>}
                  {item.badge && <span>{item.badge}</span>}
                </div>
                <p className="card-category">
                  {item.category} · {item.collection}
                </p>
                <h3>{item.name}</h3>
                <p className="card-note">{item.finish}</p>
                <div className="card-bottom">
                  <strong>{money(item.salePrice ?? item.price ?? 0)}</strong>
                  <button onClick={() => addToBag(item)}>
                    Add to bag <Plus />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="brand-story" id="story">
          <img src="/products/emerald-arc-set.webp" alt="Emerald Arc Set" />
          <div>
            <p className="eyebrow">The Zenvira Liora point of view</p>
            <h2>
              Affordable luxury,
              <br />
              <em>made personal.</em>
            </h2>
            <p>
              Jewellery should feel like you. Explore handpicked pieces designed
              to bring polish and presence to every version of your day.
            </p>
            <a href="#shop" className="text-link">
              Explore jewellery <ArrowRight />
            </a>
          </div>
        </section>
        <section className="care-strip" id="care">
          <p className="eyebrow">Wear it well</p>
          <h2>
            Keep the glow,
            <br />
            <em>wear after wear.</em>
          </h2>
          <p>
            Keep your pieces dry, store them separately, and put them on last
            after perfume and skincare.
          </p>
        </section>
      </main>
      <footer>
        <span>Zenvira Liora</span>
        <small>Premium imitation jewellery · Hyderabad, India</small>
        <a href="https://wa.me/919642987379" target="_blank" rel="noreferrer">
          WhatsApp support
        </a>
      </footer>
      {product && (
        <section className="product-page">
          <button className="back-link" onClick={closeProductPage}><ArrowRight /> Back to collection</button>
          <div className="product-page-grid">
            <div className="product-gallery"><button className="gallery-arrow gallery-prev" onClick={() => moveImage(-1)} aria-label="Previous product image"><ChevronLeft /></button><img className="product-main-image" src={activeImage || product.image} alt={product.name} />{galleryImages.length > 1 && <><button className="gallery-arrow gallery-next" onClick={() => moveImage(1)} aria-label="Next product image"><ChevronRight /></button><div className="product-thumbnails">{galleryImages.map((image, index) => <button className={image === activeImage ? "active" : ""} key={image} onClick={() => setActiveImage(image)} aria-label={`View image ${index + 1} of ${product.name}`}><img src={image} alt="" /></button>)}</div></>}</div>
            <div>
              <p className="eyebrow">{product.category}</p>
              <h2>{product.name}</h2>
              <p>{product.note}</p>
              <dl>
                <div>
                  <dt>Finish</dt>
                  <dd>{product.finish}</dd>
                </div>
                <div>
                  <dt>Material</dt>
                  <dd>{product.material}</dd>
                </div>
                <div>
                  <dt>Price</dt>
                  <dd>{money(product.salePrice ?? product.price ?? 0)}</dd>
                </div>
              </dl>
              <button
                className="primary-button"
                onClick={() => addToBag(product)}
              >
                Add to bag <ShoppingBag />
              </button>
            </div>
          </div>
        </section>
      )}
      {bagOpen && (
        <div className="overlay">
          <aside className="bag-panel">
            <header>
              <div>
                <p className="eyebrow">Your selection</p>
                <h2>
                  Shopping bag <span>{itemCount}</span>
                </h2>
              </div>
              <button className="modal-close" onClick={() => setBagOpen(false)}>
                <X />
              </button>
            </header>
            {bag.length ? (
              <>
                <div className="bag-list">
                  {bag.map(({ product: item, quantity }) => (
                    <article key={item.id}>
                      <img src={item.image} alt="" />
                      <div>
                        <h3>{item.name}</h3>
                        <p>{money(item.salePrice ?? item.price ?? 0)}</p>
                        <div className="quantity">
                          <button onClick={() => updateQuantity(item.id, -1)}>
                            <Minus />
                          </button>
                          <span>{quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)}>
                            <Plus />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setBag((current) =>
                            current.filter(
                              (entry) => entry.product.id !== item.id,
                            ),
                          )
                        }
                      >
                        <X />
                      </button>
                    </article>
                  ))}
                </div>
                <div className="bag-total">
                  <span>Subtotal</span>
                  <strong>{money(subtotal)}</strong>
                  <span>GST · {money(gst)}</span>
                  <strong>
                    Delivery · {money(delivery)}
                  </strong>
                  <span className="grand">Total</span>
                  <strong className="grand">{money(total)}</strong>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setBagOpen(false);
                      setCheckoutOpen(true);
                    }}
                  >
                    Proceed to checkout <ArrowRight />
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-bag">
                <ShoppingBag />
                <h3>Your bag is empty.</h3>
                <a href="#shop" onClick={() => setBagOpen(false)}>
                  Explore the collection
                </a>
              </div>
            )}
          </aside>
        </div>
      )}
      {checkoutOpen && (
        <div className="overlay">
          <section className="checkout-panel">
            <button
              className="modal-close"
              onClick={() => setCheckoutOpen(false)}
            >
              <X />
            </button>
            <p className="eyebrow">Secure checkout</p>
            <h2>
              Complete your
              <br />
              <em>order.</em>
            </h2>
            <div className="checkout-total">
              <span>Order total</span>
              <strong>{money(total)}</strong>
              <small>
                GST {money(gst)} · Delivery {money(delivery)}
              </small>
            </div>
            <form onSubmit={placeOrder}>
              <label>
                Full name
                <input name="name" required autoComplete="name" />
              </label>
              <label>
                Mobile number
                <input name="phone" required type="tel" autoComplete="tel" />
              </label>
              <label className="wide">
                Email
                <input
                  name="email"
                  required
                  type="email"
                  autoComplete="email"
                />
              </label>
              <label className="wide">
                Delivery address
                <input name="address" required autoComplete="street-address" />
              </label>
              <label>
                City
                <input name="city" required autoComplete="address-level2" />
              </label>
              <label>
                PIN code
                <input
                  name="pincode"
                  required
                  pattern="[0-9]{6}"
                  inputMode="numeric"
                  autoComplete="postal-code"
                />
              </label>
              <label className="wide">
                Payment method
                <select name="payment" required defaultValue="">
                  <option value="" disabled>
                    Select payment method
                  </option>
                  <option>Cash on delivery</option>
                  <option>UPI / online payment</option>
                </select>
              </label>
              <button className="primary-button wide" type="submit">
                Place order <ArrowRight />
              </button>
            </form>
          </section>
        </div>
      )}
      {order && (
        <div className="overlay">
          <section className="confirmation">
            <span className="success">✓</span>
            <p className="eyebrow">Order confirmed</p>
            <h2>
              Thank you,
              <br />
              <em>{order.name.split(" ")[0]}.</em>
            </h2>
            <p>
              Your order <strong>{order.id}</strong> is confirmed. A GST invoice
              is ready for download.
            </p>
            <div className="confirmation-meta">
              <span>Invoice number</span>
              <strong>{order.invoice}</strong>
              <span>Total paid / payable</span>
              <strong>{money(order.total)}</strong>
            </div>
            <div className="confirmation-actions"><button className="primary-button" onClick={downloadInvoice}><Download /> Download GST PDF</button></div><small className="email-status">{emailStatus}</small>
            <button className="text-link" onClick={() => setOrder(null)}>
              Continue shopping <ArrowRight />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default Storefront;
