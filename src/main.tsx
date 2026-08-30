import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Storefront from './Storefront.tsx'
import AdminCatalogue from './admin/AdminCatalogue.tsx'

const isLocalAdmin = import.meta.env.DEV && window.location.pathname === '/admin'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isLocalAdmin ? <AdminCatalogue /> : <Storefront />}
  </StrictMode>,
)
