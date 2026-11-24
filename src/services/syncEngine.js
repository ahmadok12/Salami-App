import { db, loadSheetMeta } from '../db/indexedDb.js';
import { getAccessToken } from './googleAuth.js';
import { appendLedgerRow, updateLedgerRowById, writeConfigTab } from './googleSheets.js';
import { LEDGER_HEADERS } from '../config/defaults.js';

let isSyncing = false;

/**
 * Drains the local IndexedDB syncQueue to Google Sheets sequentially.
 * Safe to call repeatedly or on browser 'online' events.
 */
export async function processSyncQueue() {
  if (isSyncing) return { synced: 0, remaining: await db.syncQueue.count() };
  if (!navigator.onLine) return { synced: 0, remaining: await db.syncQueue.count(), offline: true };

  const token = getAccessToken();
  const sheetMeta = await loadSheetMeta();
  if (!token || !sheetMeta.spreadsheetId) {
    return { synced: 0, remaining: await db.syncQueue.count(), localOnly: true };
  }

  isSyncing = true;
  let syncedCount = 0;

  try {
    const queue = await db.syncQueue.orderBy('queueId').toArray();
    for (const item of queue) {
      try {
        if (item.action === 'APPEND') {
          await appendLedgerRow(token, sheetMeta.spreadsheetId, item.payload);
          await db.entries.update(item.entryId, { sync_status: 'synced' });
        } else if (item.action === 'UPDATE') {
          await updateLedgerRowById(token, sheetMeta.spreadsheetId, item.payload);
          await db.entries.update(item.entryId, { sync_status: 'synced' });
        } else if (item.action === 'SYNC_CONFIG') {
          await writeConfigTab(token, sheetMeta.spreadsheetId, item.payload);
        }
        await db.syncQueue.delete(item.queueId);
        syncedCount += 1;
      } catch (err) {
        await db.syncQueue.update(item.queueId, { retryCount: (item.retryCount || 0) + 1 });
        console.warn('Sync item failed, will retry later:', err.message);
        break; // Preserve FIFO ordering
      }
    }
  } finally {
    isSyncing = false;
  }

  const remaining = await db.syncQueue.count();
  return { synced: syncedCount, remaining };
}

/**
 * Exports all IndexedDB entries to a downloadable .CSV file (works 100% offline).
 */
export function exportEntriesToCSV(entries, weddingTitle = 'SalamiBook') {
  const escapeCsv = (val) => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [
    LEDGER_HEADERS.join(','),
    ...entries.map((e) =>
      [
        e.id, e.timestamp, e.guest_name, e.amount ?? '', e.currency, e.mode,
        e.envelope_no, e.status, e.notes_breakdown, e.collected_by,
        e.event, e.group, e.side, e.city, e.note
      ]
        .map(escapeCsv)
        .join(',')
    )
  ];

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${weddingTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-ledger.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
