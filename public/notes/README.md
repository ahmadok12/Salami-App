# Banknote Thumbnails (`public/notes/`)

SalamiBook automatically loads banknote images from this folder based on the active currency and denomination:

```text
public/notes/
├── pkr/
│   ├── 10.webp
│   ├── 20.webp
│   ├── 50.webp
│   ├── 100.webp
│   ├── 500.webp
│   ├── 1000.webp
│   └── 5000.webp
├── inr/        (optional — add 10.webp, 20.webp, 50.webp, 100.webp, 200.webp, 500.webp)
├── sar/        (optional — add 5.webp, 10.webp, 50.webp, 100.webp, 200.webp, 500.webp)
├── aed/        (optional — add 5.webp, 10.webp, 20.webp, 50.webp, 100.webp, 200.webp, 500.webp, 1000.webp)
├── gbp/        (optional — add 5.webp, 10.webp, 20.webp, 50.webp)
└── usd/        (optional — add 1.webp, 5.webp, 10.webp, 20.webp, 50.webp, 100.webp)
```

## How It Works

- **Supported formats:** `.webp` (recommended, smallest), `.png`, or `.jpg` — `BanknoteTile.jsx` checks them in that order.
- **Automatic bundles:** Multi-note chips (e.g., `Rs. 2,000`, `Rs. 10,000`, `Rs. 20,000`) automatically reuse the base denomination image (`1000.webp` or `5000.webp`) with stacked-note layers and a `×2` / `×4` badge.
- **Zero-breakage fallback:** Any currency or denomination without an image file automatically renders the built-in stylized SVG banknote.
- **Recommended size:** `280 × 130 px` (landscape) in `.webp` format (~5–15 KB each) so the PWA Service Worker precaches them cleanly for offline marquee use.
