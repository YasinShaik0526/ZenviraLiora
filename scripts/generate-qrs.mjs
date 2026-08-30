import path from 'node:path'
import QRCode from 'qrcode'

const publicDir = path.join(process.cwd(), 'public')
const whatsappNumber = (process.env.VITE_WHATSAPP_NUMBER ?? '919642987379').replace(/\D/g, '')
const instagramHandle = (process.env.VITE_INSTAGRAM_HANDLE ?? 'zenviraliora').replace(/^@/, '')
const options = {
  width: 420,
  margin: 2,
  errorCorrectionLevel: 'H',
  color: { dark: '#112b1b', light: '#fffaf1' },
}

await Promise.all([
  QRCode.toFile(path.join(publicDir, 'whatsapp-qr.png'), `https://wa.me/${whatsappNumber}`, options),
  QRCode.toFile(path.join(publicDir, 'instagram-qr.png'), `https://instagram.com/${instagramHandle}`, options),
])

console.log('Generated WhatsApp and Instagram QR codes.')