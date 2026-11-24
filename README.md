# SalamiBook — Open-Source Wedding Salami Collector (PWA)

An offline-first, minimal-typing Progressive Web App designed for Pakistani weddings. Built with **React + Vite + Tailwind CSS + IndexedDB (Dexie)** and backed by **Google Sheets (Bring Your Own Database)**.

- **Zero server or database costs:** Data flows directly from the collector's phone to their own Google Drive spreadsheet.
- **Marquee-ready offline mode:** Saves 100% locally in `IndexedDB` first and syncs automatically to Google Sheets when signal returns.
- **Cash & Sealed Envelope modes:** Log instant cash with additive banknote chips, or assign auto-incrementing serial numbers (e.g., `A-14`) to sealed *lifafay* and clear them rapidly after the event.
- **End-of-night cash reconciliation:** Tracks physical note denominations (`Rs. 5,000` down to `Rs. 10`, plus `GBP`, `USD`, `AED`) per collector.
- **2-Tab Google Sheet Schema:** `Ledger` (15 fixed columns) + `_Config` (dynamic wedding settings synced across all co-collectors).

---

## Quick Start (Works Immediately Offline!)

You do **not** need to configure Google Cloud Console to run, test, or use SalamiBook locally:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Without `.env` credentials, SalamiBook runs in **Local Offline Mode** with full IndexedDB persistence, Cash/Envelope workflows, Settings customization, and instant `.CSV` export.

---

## Connecting Google Sheets (Google Cloud Console Setup)

When you are ready to enable **Sign in with Google**, live Google Sheets sync, and multi-collector sharing:

1. **Create a Project:** Go to [Google Cloud Console](https://console.cloud.google.com/) and create a new project (e.g., `SalamiBook`).
2. **Enable 3 APIs** (*APIs & Services → Library*):
   - **Google Sheets API**
   - **Google Drive API**
   - **Google Picker API**
3. **Configure OAuth Consent Screen** (*Google Auth Platform / OAuth consent screen*):
   - Choose **External**.
   - Add your app name (`SalamiBook`), support email, and link to your hosted `/privacy.html`.
   - Under **Scopes**, add:
     - `https://www.googleapis.com/auth/drive.file` *(non-sensitive — only accesses sheets created or picked by your app)*
     - `openid`, `email`, `profile`
   - While in Testing mode, add your Gmail and any co-collectors' Gmail addresses under **Test Users**.
4. **Create Credentials** (*APIs & Services → Credentials*):
   - **OAuth 2.0 Client ID (Web application):** Add your local origin (`http://localhost:5173`) and production domain (e.g., `https://salamibook.pages.dev`) under **Authorized JavaScript origins**.
   - **API Key:** Create an API key (restrict it to your domain + Google Picker API & Google Sheets API).
   - Note your **Project Number** from the Google Cloud Dashboard (this is your `VITE_GOOGLE_APP_ID` for Google Picker).
5. **Configure `.env`:**
   ```bash
   cp .env.example .env
   ```
   Paste your `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`, and `VITE_GOOGLE_APP_ID`, then restart `npm run dev`.

---

## Google Sheets Schema

SalamiBook creates a spreadsheet with two tabs:

1. **`Ledger` (15 Fixed Columns):**
   `id` | `timestamp` | `guest_name` | `amount` | `currency` | `mode` | `envelope_no` | `status` | `notes_breakdown` | `collected_by` | `event` | `group` | `side` | `city` | `note`
2. **`_Config` (Key-Value Settings Synced Across Devices):**
   `schema_version`, `wedding_title`, `envelope_prefix`, `currency`, `honorifics`, `events`, `groups`, `sides`, `cities_adaptive`, `updated_at`.

---

## Deploying for Free

Build the production PWA bundle:

```bash
npm run build
```

Deploy the `dist/` folder to **Cloudflare Pages**, **Vercel**, or **GitHub Pages**.

### iPhone / Android Field Tip
Before the wedding starts, open the deployed URL on each collector's phone and tap **Add to Home Screen**. This caches the full app offline via the Service Worker and protects iOS Safari's `IndexedDB` from 7-day inactivity eviction.
