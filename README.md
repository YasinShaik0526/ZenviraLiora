# Zenvira Liora Website

Responsive React sales website for Zenvira Liora Private Limited, presenting a curated premium imitation jewellery collection with product discovery, quick views, persistent cart, direct checkout, automatic order email confirmations, and GST PDF invoices.

## Run locally

```powershell
npm install
npm run dev
```

Production checks:

```powershell
npm run lint
npm run build
```

Regenerate optimized WebP assets after changing source photography:

```powershell
npm run optimize:images
```

## Launch configuration

Copy `.env.example` to `.env` for local development and set the same values in **Netlify → Site configuration → Environment variables**:

- `VITE_WHATSAPP_NUMBER`: flyer-verified business number, digits only with country code
- `VITE_INSTAGRAM_HANDLE`: flyer-verified Instagram username without `@`
- `VITE_SALES_EMAIL`: verified customer-care address (`ZenviraLiora@gmail.com`)
- `VITE_REGISTERED_ADDRESS`: flyer-published Hyderabad location
- `VITE_SITE_URL`: verified public origin used for canonical links and the sitemap
- `VITE_ERROR_ENDPOINT`: optional HTTPS endpoint accepting client error JSON
- `RESEND_API_KEY`: server-only Resend API key for order confirmation emails
- `RESEND_FROM_EMAIL`: sender address on a verified Resend domain, for example `orders@zenviraliora.com`

When a customer places an order, the Netlify Function at `/.netlify/functions/send-order-confirmation` sends the order details to `ZenviraLiora@gmail.com` and a confirmation to the customer email. The website also generates a GST PDF invoice locally. Prices, stock, business contacts, delivery times, and return windows must be verified by the company before publication.

Product photographs and the official logo were supplied from `F:\GitHub\CK_Sales_POS\images`.

## Required launch approvals

The following inputs cannot be inferred from the flyer and must be supplied by the business before launch:

- Approved INR price and availability for every SKU
- Supplier-confirmed composition, dimensions, weight, colours, and finish
- Additional product photographs for front, back, clasp, detail, scale, and variants
- Product photography for currently source-only flyer collections
- Verified customer-care email address
- Final public domain in `VITE_SITE_URL`
- Legal approval of Privacy, Terms, Shipping, and Returns wording

Use `content/product-catalog-template.csv` to collect approved commercial and supplier data. Follow `content/PRODUCT_PHOTO_PLAN.md` when preparing additional product and missing-collection photography. Policies remain marked for legal review until written approval is received.

## Local managed catalogue

Run `npm run dev` and open `/admin` to maintain products locally. The editor saves categories, collections, prices, discounts, stock, optional measurements, publishing status, and image paths to `content/products.json`. Product image copies live in `public/products`.

Follow `docs/CATALOGUE_SETUP.md` for the complete edit, validation, and GitHub deployment workflow. No external database is required.

Before the first production order:

1. Verify `zenviraliora.com` in Resend and create an API key.
2. Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in **Netlify → Site configuration → Environment variables**.
3. Deploy and place a test order using a real customer email address.
4. Confirm the store email arrives at `ZenviraLiora@gmail.com` and the customer email arrives at the checkout address.
5. Confirm the downloaded GST PDF includes GSTIN `36AADCZ0700G1ZO`.
6. Confirm the generated `sitemap.xml`, canonical URL, social preview, and every direct route use the final domain.

## Deployment

The included Netlify configuration builds the Vite application into `dist` and serves `index.html` as the SPA fallback. The root entry filename must remain lowercase for Linux-based deployment environments.

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
