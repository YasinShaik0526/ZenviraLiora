const storeEmail = 'ZenviraLiora@gmail.com'

export default async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const { RESEND_API_KEY, RESEND_FROM_EMAIL } = process.env
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) return new Response(JSON.stringify({ error: 'Email service is not configured' }), { status: 503, headers: { 'Content-Type': 'application/json' } })

  let order
  try {
    order = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Request body must be valid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
  if (!order || typeof order !== 'object' || !order.id || !order.invoice || !order.name || !order.email || !Array.isArray(order.items) || typeof order.total !== 'number') return new Response(JSON.stringify({ error: 'Invalid order payload' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  const items = order.items.map(({ product, quantity }) => `${product.sku} - ${product.name} x${quantity} - INR ${((product.salePrice ?? product.price ?? 0) * quantity).toLocaleString('en-IN')}`).join('\n')
  const details = [`Order ID: ${order.id}`, `Invoice: ${order.invoice}`, `Date: ${new Date(order.date).toLocaleDateString('en-IN')}`, `Customer: ${order.name}`, `Mobile: ${order.phone}`, `Email: ${order.email}`, `Address: ${order.address}`, `Payment: ${order.payment}`, '', 'Items:', items, '', `Taxable subtotal: INR ${order.subtotal.toLocaleString('en-IN')}`, `GST: INR ${order.gst.toLocaleString('en-IN')}`, `Delivery: ${order.delivery ? `INR ${order.delivery}` : 'Free'}`, `Total: INR ${order.total.toLocaleString('en-IN')}`].join('\n')
  const send = (to, subject, text) => fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [to], subject, text }) })
  const [storeResponse, customerResponse] = await Promise.all([send(storeEmail, `New order ${order.id} - ${order.invoice}`, details), send(order.email, `Zenvira Liora order confirmation ${order.id}`, `Hello ${order.name},\n\nThank you for your order with Zenvira Liora.\n\n${details}\n\nYour GST invoice is available from the order confirmation screen.`)])
  if (!storeResponse.ok || !customerResponse.ok) return new Response(JSON.stringify({ error: 'Unable to send one or more confirmation emails' }), { status: 502, headers: { 'Content-Type': 'application/json' } })
  return new Response(JSON.stringify({ sent: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}