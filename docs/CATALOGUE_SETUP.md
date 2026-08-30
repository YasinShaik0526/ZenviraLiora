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

1. Prepare an approved image without overwriting its original source.
2. Place the website copy in `public/products`.
3. Enter `/products/filename.webp` as the image path.
4. Confirm that the image renders before publishing.

## Validate and publish through GitHub

```powershell
npm run validate:catalogue
npm run lint
npm run build
```

Commit `content/products.json` and `public/products/` to Git. Netlify then rebuilds the website from the committed catalogue. No external database is required.

The migration under `supabase/migrations` remains only as a future option for simultaneous multi-user editing or online order processing.
