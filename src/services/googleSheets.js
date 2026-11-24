import { LEDGER_HEADERS, DEFAULT_CONFIG, parseNotesBreakdown } from '../config/defaults.js';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

function entryToRow(entry) {
  return [
    entry.id || '',
    entry.timestamp || new Date().toISOString(),
    entry.guest_name || '',
    entry.amount === null || entry.amount === undefined ? '' : Number(entry.amount),
    entry.currency || 'PKR',
    entry.mode || 'Cash',
    entry.envelope_no || '',
    entry.status || 'Collected',
    entry.notes_breakdown || '',
    entry.collected_by || '',
    entry.event || '',
    entry.group || '',
    entry.side || '',
    entry.city || '',
    entry.note || ''
  ];
}

function rowToEntry(row) {
  const [
    id, timestamp, guest_name, amount, currency, mode, envelope_no,
    status, notes_breakdown, collected_by, event, group, side, city, note
  ] = row;

  return {
    id: id || `sal_${Math.random().toString(36).slice(2, 10)}`,
    timestamp: timestamp || new Date().toISOString(),
    guest_name: guest_name || 'Unknown Guest',
    amount: amount === '' || amount === undefined ? null : Number(amount),
    currency: currency || 'PKR',
    mode: mode || 'Cash',
    envelope_no: envelope_no || '',
    status: status || 'Collected',
    notes_breakdown: notes_breakdown || '',
    notes_map: parseNotesBreakdown(notes_breakdown || ''),
    collected_by: collected_by || '',
    event: event || '',
    group: group || '',
    side: side || '',
    city: city || '',
    note: note || '',
    sync_status: 'synced'
  };
}

function configToRows(config) {
  return [
    ['key', 'value'],
    ['schema_version', config.schema_version || '1.0'],
    ['wedding_title', config.wedding_title || 'Wedding Salami Ledger'],
    ['envelope_prefix', config.envelope_prefix ?? ''],
    ['currency', config.currency || 'PKR'],
    ['honorifics', JSON.stringify(config.honorifics || DEFAULT_CONFIG.honorifics)],
    ['events', JSON.stringify(config.events || DEFAULT_CONFIG.events)],
    ['groups', JSON.stringify(config.groups || DEFAULT_CONFIG.groups)],
    ['sides', JSON.stringify(config.sides || DEFAULT_CONFIG.sides)],
    ['cities_adaptive', JSON.stringify(config.cities_adaptive || [])],
    ['updated_at', config.updated_at || new Date().toISOString()]
  ];
}

function rowsToConfig(rows) {
  const parsed = {};
  for (const [key, val] of rows) {
    if (!key || key === 'key') continue;
    if (['honorifics', 'events', 'groups', 'sides', 'cities_adaptive'].includes(key)) {
      try {
        parsed[key] = JSON.parse(val);
      } catch {
        // ignore invalid JSON
      }
    } else {
      parsed[key] = val;
    }
  }
  return parsed;
}

/**
 * Creates a brand-new Google Sheet with Ledger + _Config tabs under the user's Google Drive.
 */
export async function createWeddingSpreadsheet(accessToken, config) {
  const title = `SalamiBook — ${config.wedding_title || 'Wedding Ledger'}`;
  const res = await fetch(SHEETS_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: {
            title: 'Ledger',
            gridProperties: { frozenRowCount: 1 }
          }
        },
        {
          properties: {
            title: '_Config',
            gridProperties: { frozenRowCount: 1 }
          }
        }
      ]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create sheet: ${err}`);
  }

  const sheet = await res.json();
  const spreadsheetId = sheet.spreadsheetId;

  // Initialize headers & _Config tab in one batchUpdate
  await fetch(`${SHEETS_BASE}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: 'Ledger!A1:O1', values: [LEDGER_HEADERS] },
        { range: '_Config!A1:B12', values: configToRows(config) }
      ]
    })
  });

  return {
    spreadsheetId,
    spreadsheetName: title,
    spreadsheetUrl: sheet.spreadsheetUrl
  };
}

/**
 * Launches Google Picker so a co-collector can select a shared wedding sheet (grants drive.file access).
 */
export function openGooglePicker(accessToken) {
  return new Promise((resolve, reject) => {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const appId = import.meta.env.VITE_GOOGLE_APP_ID;
    if (!apiKey || !window.gapi) {
      reject(new Error('Google Picker requires VITE_GOOGLE_API_KEY and online access.'));
      return;
    }

    window.gapi.load('picker', () => {
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.SPREADSHEETS)
        .setIncludeFolders(false)
        .setSelectFolderEnabled(false);

      const picker = new window.google.picker.PickerBuilder()
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setAppId(appId || '')
        .addView(view)
        .setCallback((data) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs[0];
            resolve({
              spreadsheetId: doc.id,
              spreadsheetName: doc.name,
              spreadsheetUrl: doc.url
            });
          } else if (data.action === window.google.picker.Action.CANCEL) {
            resolve(null);
          }
        })
        .build();

      picker.setVisible(true);
    });
  });
}

/**
 * Reads both Ledger and _Config tabs from Google Sheets.
 */
export async function fetchLedgerAndConfig(accessToken, spreadsheetId) {
  const ranges = ['Ledger!A2:O', '_Config!A2:B']
    .map((r) => `ranges=${encodeURIComponent(r)}`)
    .join('&');

  const res = await fetch(`${SHEETS_BASE}/${spreadsheetId}/values:batchGet?${ranges}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch sheet data (${res.status})`);
  }

  const data = await res.json();
  const ledgerRows = data.valueRanges?.[0]?.values || [];
  const configRows = data.valueRanges?.[1]?.values || [];

  return {
    entries: ledgerRows.filter((r) => r.length > 0).map(rowToEntry),
    config: rowsToConfig(configRows)
  };
}

/**
 * Appends a single row safely (multi-collector safe).
 */
export async function appendLedgerRow(accessToken, spreadsheetId, entry) {
  const res = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/Ledger!A:O:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [entryToRow(entry)] })
    }
  );
  if (!res.ok) {
    throw new Error(`Append failed (${res.status})`);
  }
  return res.json();
}

/**
 * Finds an entry's row by ID in column A and updates it in place (used when clearing Pending Envelopes).
 */
export async function updateLedgerRowById(accessToken, spreadsheetId, entry) {
  const idRes = await fetch(`${SHEETS_BASE}/${spreadsheetId}/values/Ledger!A:A`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!idRes.ok) {
    throw new Error(`Lookup failed (${idRes.status})`);
  }
  const idData = await idRes.json();
  const colA = idData.values || [];
  const rowIndex = colA.findIndex((r) => r[0] === entry.id);

  if (rowIndex === -1) {
    // Fallback: append if not found
    return appendLedgerRow(accessToken, spreadsheetId, entry);
  }

  const sheetRowNumber = rowIndex + 1; // 1-indexed
  const updateRes = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/Ledger!A${sheetRowNumber}:O${sheetRowNumber}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [entryToRow(entry)] })
    }
  );
  if (!updateRes.ok) {
    throw new Error(`Row update failed (${updateRes.status})`);
  }
  return updateRes.json();
}

export async function writeConfigTab(accessToken, spreadsheetId, config) {
  const res = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/_Config!A1:B12?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: configToRows(config) })
    }
  );
  if (!res.ok) {
    throw new Error(`Config update failed (${res.status})`);
  }
  return res.json();
}
