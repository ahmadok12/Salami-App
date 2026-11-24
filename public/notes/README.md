# Banknote Thumbnails (`public/notes/`)

SalamiBook automatically loads banknote images from this folder based on the active currency and denomination:

```text
public/notes/
├── pkr/   10.webp, 20.webp, 50.webp, 100.webp, 500.webp, 1000.webp, 5000.webp
├── inr/   10.webp, 20.webp, 50.webp, 100.webp, 200.webp, 500.webp
├── sar/   10.webp, 50.webp, 100.webp, 500.webp
├── aed/   10.webp, 20.webp, 50.webp, 100.webp, 200.webp, 500.webp, 1000.webp
├── gbp/   10.webp, 20.webp, 50.webp, 100.webp
└── usd/   10.webp, 20.webp, 50.webp, 100.webp
```

## How It Works

- **Supported formats:** `.webp` (recommended, smallest), `.png`, or `.jpg` — `BanknoteTile.jsx` checks them in that order.
- **Automatic bundles:** Multi-note chips (e.g., `Rs. 2,000`, `Rs. 10,000`, `Rs. 20,000` or `AED 2,000`) automatically reuse the base denomination image with stacked-note layers and a `×2` / `×4` badge.
- **Zero-breakage fallback:** Any currency or denomination without an image file automatically renders the built-in stylized SVG banknote.
- **Offline PWA cache:** All `.webp` files are precached by the Service Worker so banknote images load even with zero internet connection.
