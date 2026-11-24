# Contributing to SalamiBook

Thank you for helping improve **SalamiBook**, an open-source, offline-first wedding salami collector backed by Google Sheets!

## Local Setup

1. Fork this repository and clone your fork.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run locally (no Google Cloud keys required for Local Offline Mode):
   ```bash
   npm run dev
   ```
4. To test live Google Sheets sync, copy `.env.example` to `.env` and add your Google Cloud Console credentials (see `README.md`).

## Guidelines

- **Offline-first always:** Never block user input on a live network request. Write to `IndexedDB` (`src/db/indexedDb.js`) first, then enqueue a sync job.
- **Keep permissions minimal:** Only use the non-sensitive `drive.file` scope. Do not introduce broader Drive or Sheets scopes.
- **Respect the 2-tab schema:** Keep the 15 fixed columns in `Ledger` backward-compatible so existing family spreadsheets never break.

## Submitting Changes

1. Create a feature branch (`git checkout -b feat/your-feature`).
2. Test on a mobile viewport (375px–430px) and in browser Offline mode.
3. Open a Pull Request describing the change and why it helps collectors at live weddings.
