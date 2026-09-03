# Local Catalogue Setup

The catalogue is maintained locally in `content/products.json`. That file and product images can be committed to GitHub, reviewed in history, and deployed with the website.

## Open the editor

```powershell
npm run dev
```

Open `http://127.0.0.1:5173/admin`.

The editor is development-only. It is not an editable administration route on the deployed production website.

## Maintain products

1. Select a product or choose **Add product**.
2. Maintain its category, collection, price, sale price, current stock, and optional measurements.
3. Use `draft` while preparing a product, `published` to show it, or `archived` to retain it without publishing.
4. Choose **Save catalogue**. The development server atomically updates `content/products.json`.

Stock quantity derives customer availability automatically:

- `0`: Out of stock
- `1` through the low-stock threshold: Limited
- Above the threshold: Available
- Use Confirm availability when quantities are not maintained yet

## Add images

1. Drop the approved photo into `src/assets/products`, named to match the product slug (for example `kundan-petal-set.jpeg`).
2. Run `npm run optimize:images`. It automatically converts every photo in that folder to an optimized `.webp` and publishes copies to `src/assets/optimized` (for the built-in demo catalogue) and `public/products` (for `content/products.json`).
3. Enter `/products/filename.webp` as the image path for the product.
4. Confirm that the image renders before publishing.

## Validate and publish through GitHub

```powershell
npm run validate:catalogue
npm run lint
npm run build
```

Commit `content/products.json` and `public/products/` to Git. Netlify then rebuilds the website from the committed catalogue. No external database is required.

The migration under `supabase/migrations` remains only as a future option for simultaneous multi-user editing or online order processing.
