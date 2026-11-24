export const SCHEMA_VERSION = '1.0';

export const LEDGER_HEADERS = [
  'id',
  'timestamp',
  'guest_name',
  'amount',
  'currency',
  'mode',
  'envelope_no',
  'status',
  'notes_breakdown',
  'collected_by',
  'event',
  'group',
  'side',
  'city',
  'note'
];

export const CURRENCY_PRESETS = {
  PKR: {
    code: 'PKR',
    symbol: 'Rs.',
    quickChips: [500, 1000, 2000, 5000, 10000, 20000],
    denominations: [5000, 1000, 500, 100, 50, 20, 10],
    noteColors: {
      5000: '#C48A3A',
      1000: '#3B6EA5',
      500: '#3D8B68',
      100: '#C04B4B',
      50: '#6E5A9E',
      20: '#B57B4C',
      10: '#5F8D7E'
    }
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    quickChips: [10, 20, 50, 100, 200, 500],
    denominations: [50, 20, 10, 5],
    noteColors: { 50: '#C04B4B', 20: '#6E5A9E', 10: '#B57B4C', 5: '#3D8B68' }
  },
  USD: {
    code: 'USD',
    symbol: '$',
    quickChips: [20, 50, 100, 200, 500, 1000],
    denominations: [100, 50, 20, 10, 5, 1],
    noteColors: { 100: '#3D8B68', 50: '#C04B4B', 20: '#5F8D7E', 10: '#C48A3A', 5: '#6E5A9E', 1: '#555555' }
  },
  AED: {
    code: 'AED',
    symbol: 'AED ',
    quickChips: [50, 100, 200, 500, 1000, 2000],
    denominations: [1000, 500, 200, 100, 50, 20, 10, 5],
    noteColors: { 1000: '#B57B4C', 500: '#3B6EA5', 200: '#C48A3A', 100: '#C04B4B', 50: '#6E5A9E', 20: '#3D8B68', 10: '#5F8D7E', 5: '#888888' }
  }
};

export const DEFAULT_CONFIG = {
  schema_version: SCHEMA_VERSION,
  wedding_title: 'Ali & Ayesha Wedding',
  active_collector: 'Collector 1',
  envelope_prefix: 'A-',
  currency: 'PKR',
  honorifics: [
    'Haji', 'Mian', 'Chaudhry', 'Dr.', 'Malik', 'Sardar',
    'Chacha', 'Mamu', 'Khala', 'Phupho', 'Taya', 'Uncle', 'Aunty'
  ],
  events: ['Mehndi', 'Barat', 'Walima'],
  groups: ['Dadhaal', 'Nanhaal', 'Neighbors', 'Office', 'Friends', 'Village'],
  sides: ['Groom Side', 'Bride Side'],
  cities_adaptive: ['Lahore', 'Islamabad', 'Karachi', 'Faisalabad'],
  visible_fields: {
    group: false,
    event: false,
    side: false,
    city: false,
    note: false
  }
};

export function formatCurrency(amount, currencyCode = 'PKR') {
  const preset = CURRENCY_PRESETS[currencyCode] || CURRENCY_PRESETS.PKR;
  const num = Number(amount) || 0;
  return `${preset.symbol} ${num.toLocaleString('en-US')}`;
}

/**
 * Greedily breaks down an amount into standard physical banknotes.
 */
export function breakdownAmountToNotes(amount, currencyCode = 'PKR') {
  const preset = CURRENCY_PRESETS[currencyCode] || CURRENCY_PRESETS.PKR;
  let remaining = Math.max(0, Math.floor(Number(amount) || 0));
  const result = {};
  for (const denom of preset.denominations) {
    if (remaining >= denom) {
      const count = Math.floor(remaining / denom);
      result[denom] = count;
      remaining -= count * denom;
    }
  }
  return result;
}

export function serializeNotesBreakdown(notesObj) {
  if (!notesObj || typeof notesObj !== 'object') return '';
  return Object.entries(notesObj)
    .filter(([, qty]) => Number(qty) > 0)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([denom, qty]) => `${denom}x${qty}`)
    .join(', ');
}

export function parseNotesBreakdown(str) {
  const result = {};
  if (!str || typeof str !== 'string') return result;
  str.split(',').forEach((part) => {
    const [d, q] = part.trim().split('x');
    const denom = Number(d);
    const qty = Number(q);
    if (denom > 0 && qty > 0) {
      result[denom] = (result[denom] || 0) + qty;
    }
  });
  return result;
}

export function generateEntryId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `sal_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `sal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
