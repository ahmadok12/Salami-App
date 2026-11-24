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
  INR: {
    code: 'INR',
    symbol: '₹',
    quickChips: [500, 1000, 2000, 5000, 10000, 20000],
    denominations: [500, 200, 100, 50, 20, 10],
    noteColors: {
      500: '#6E7B73',
      200: '#E59A3C',
      100: '#7B68A8',
      50: '#35A2B8',
      20: '#A5B84B',
      10: '#8D5B4C'
    }
  },
  SAR: {
    code: 'SAR',
    symbol: 'SAR',
    quickChips: [50, 100, 200, 500, 1000, 2000],
    denominations: [500, 200, 100, 50, 10, 5],
    noteColors: {
      500: '#3B6EA5',
      200: '#8A8D91',
      100: '#C04B4B',
      50: '#3D8B68',
      10: '#B57B4C',
      5: '#6E5A9E'
    }
  },
  AED: {
    code: 'AED',
    symbol: 'AED',
    quickChips: [50, 100, 200, 500, 1000, 2000],
    denominations: [1000, 500, 200, 100, 50, 20, 10, 5],
    noteColors: { 1000: '#B57B4C', 500: '#3B6EA5', 200: '#C48A3A', 100: '#C04B4B', 50: '#6E5A9E', 20: '#3D8B68', 10: '#5F8D7E', 5: '#888888' }
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
  }
};

export const DEFAULT_CONFIG = {
  schema_version: SCHEMA_VERSION,
  wedding_title: 'Ali & Ayesha Wedding',
  active_collector: 'Collector 1',
  envelope_prefix: 'A-',
  currency: 'PKR',
  quick_chips: [500, 1000, 2000, 5000, 10000, 20000],
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


/**
 * Authentic banknote color palettes for every supported currency.
 * bg: rich card background | paper: miniature note paper tint | ink: note detail color | strip: security thread
 */
export const BANKNOTE_THEMES = {
  PKR: {
    5000:  { bg: '#B38738', paper: '#F5E7C4', ink: '#6E4F1A', strip: '#8C6420' },
    1000:  { bg: '#36499B', paper: '#DCE4F9', ink: '#1E2C6B', strip: '#273882' },
    500:   { bg: '#237A57', paper: '#D3F0E3', ink: '#124D35', strip: '#1A6144' },
    100:   { bg: '#B83B3B', paper: '#F9DADA', ink: '#731D1D', strip: '#942A2A' },
    50:    { bg: '#6A4C93', paper: '#E8DFF7', ink: '#3F2761', strip: '#54397A' },
    20:    { bg: '#A67442', paper: '#F4E4D1', ink: '#613E1C', strip: '#82572D' },
    10:    { bg: '#3D7A6E', paper: '#D5EFEA', ink: '#1E4C43', strip: '#2C6157' },
    // Distinct bundle overrides matching visual hierarchy
    2000:  { bg: '#4349A6', paper: '#DDE2FA', ink: '#232870', strip: '#31378C' },
    10000: { bg: '#A87B28', paper: '#F6E6BE', ink: '#634510', strip: '#855E19' },
    20000: { bg: '#8A2832', paper: '#F5D6D9', ink: '#571219', strip: '#6E1C25' }
  },
  INR: {
    500:   { bg: '#5B6B62', paper: '#E2E9E5', ink: '#2F3B35', strip: '#44544B' },
    200:   { bg: '#D67D1E', paper: '#FDE7CA', ink: '#7F4408', strip: '#B06210' },
    100:   { bg: '#6D599E', paper: '#E9E1F8', ink: '#3D2E66', strip: '#554282' },
    50:    { bg: '#1F8A9E', paper: '#D2F1F7', ink: '#0E505E', strip: '#166D7E' },
    20:    { bg: '#84992E', paper: '#EDF4CF', ink: '#4A5912', strip: '#687A1E' },
    10:    { bg: '#7D513D', paper: '#F0E1D9', ink: '#4A2C1F', strip: '#633D2C' },
    // Bundle overrides
    1000:  { bg: '#3B6E75', paper: '#D7ECEF', ink: '#1C4147', strip: '#2B565C' },
    2000:  { bg: '#A62C6B', paper: '#F8D6E8', ink: '#63123D', strip: '#851D53' },
    5000:  { bg: '#5A7348', paper: '#E0ECD8', ink: '#314424', strip: '#455C35' },
    10000: { bg: '#3D4C8C', paper: '#DCE2F7', ink: '#1F2A59', strip: '#2E3B73' },
    20000: { bg: '#8A2832', paper: '#F5D6D9', ink: '#571219', strip: '#6E1C25' }
  },
  SAR: {
    500:   { bg: '#2B5B9E', paper: '#D7E5F9', ink: '#153666', strip: '#1F4882' },
    200:   { bg: '#636B73', paper: '#E4E8EC', ink: '#353B40', strip: '#4C535A' },
    100:   { bg: '#B53838', paper: '#F8D9D9', ink: '#6E1B1B', strip: '#912828' },
    50:    { bg: '#267A52', paper: '#D3F0E2', ink: '#124D31', strip: '#1B6140' },
    10:    { bg: '#8E5B3A', paper: '#F2E2D5', ink: '#57331C', strip: '#73472B' },
    5:     { bg: '#6A4B94', paper: '#E8DFF7', ink: '#3F2761', strip: '#54397A' },
    // Bundle overrides
    1000:  { bg: '#1F4B7A', paper: '#D4E4F5', ink: '#0F2A47', strip: '#173A61' },
    2000:  { bg: '#8A2832', paper: '#F5D6D9', ink: '#571219', strip: '#6E1C25' }
  },
  AED: {
    1000:  { bg: '#9E6B38', paper: '#F4E4D1', ink: '#5E3B19', strip: '#7D5126' },
    500:   { bg: '#2A6496', paper: '#D6E8F8', ink: '#143B5E', strip: '#1F4F7A' },
    200:   { bg: '#B88428', paper: '#F8EAC9', ink: '#6E4B0E', strip: '#94681A' },
    100:   { bg: '#B33642', paper: '#F8D7DB', ink: '#6B1820', strip: '#8F2630' },
    50:    { bg: '#694D94', paper: '#E7DFF6', ink: '#3D275E', strip: '#523A78' },
    20:    { bg: '#2C7E66', paper: '#D4F0E8', ink: '#144F3E', strip: '#206651' },
    10:    { bg: '#3F8254', paper: '#D9F0E0', ink: '#1F4F2E', strip: '#2F6941' },
    5:     { bg: '#BD6234', paper: '#F8E0D3', ink: '#733516', strip: '#994B24' },
    // Bundle override
    2000:  { bg: '#8A2832', paper: '#F5D6D9', ink: '#571219', strip: '#6E1C25' }
  },
  GBP: {
    50:    { bg: '#B0303C', paper: '#F8D6DA', ink: '#69151D', strip: '#8C222C' },
    20:    { bg: '#6B4796', paper: '#E8DDF7', ink: '#3F2461', strip: '#54357A' },
    10:    { bg: '#B36B32', paper: '#F6E2CE', ink: '#6B3B14', strip: '#8F5222' },
    5:     { bg: '#287D7D', paper: '#D3F0F0', ink: '#124D4D', strip: '#1C6363' },
    // Bundle overrides
    100:   { bg: '#8F2430', paper: '#F6D5D9', ink: '#571018', strip: '#731A24' },
    200:   { bg: '#3B4D8C', paper: '#DCE2F7', ink: '#1E2A59', strip: '#2C3B73' },
    500:   { bg: '#A67A2A', paper: '#F5E6C4', ink: '#614410', strip: '#855F1C' }
  },
  USD: {
    100:   { bg: '#2D6B5E', paper: '#D7EDE8', ink: '#164239', strip: '#2B5EA8' },
    50:    { bg: '#8E5258', paper: '#F2E0E2', ink: '#542A2F', strip: '#703D43' },
    20:    { bg: '#3D7A54', paper: '#DAEFE1', ink: '#1E4D30', strip: '#2E6342' },
    10:    { bg: '#8C7338', paper: '#F1E9D4', ink: '#54431B', strip: '#705A28' },
    5:     { bg: '#67597A', paper: '#E6E0EE', ink: '#3B304A', strip: '#514463' },
    1:     { bg: '#3C6B4B', paper: '#DAE9DF', ink: '#1E4229', strip: '#2D573A' },
    // Bundle overrides
    200:   { bg: '#24594D', paper: '#D4EAE5', ink: '#11362E', strip: '#2B5EA8' },
    500:   { bg: '#3B4F6B', paper: '#DCE4EE', ink: '#1E2C40', strip: '#2C3D54' },
    1000:  { bg: '#9C782B', paper: '#F4E8C6', ink: '#5C4411', strip: '#7D5E1E' }
  }
};

/**
 * Resolves the authentic banknote theme, dominant denomination, and stacked-note count
 * for any tile amount (including user-added custom amounts) in any supported currency.
 */
export function getTileVisualTheme(amount, currencyCode = 'PKR') {
  const preset = CURRENCY_PRESETS[currencyCode] || CURRENCY_PRESETS.PKR;
  const themes = BANKNOTE_THEMES[currencyCode] || BANKNOTE_THEMES.PKR;
  const breakdown = breakdownAmountToNotes(amount, currencyCode);
  const denoms = Object.keys(breakdown)
    .map(Number)
    .sort((a, b) => b - a);

  const baseDenom = denoms[0] || preset.denominations[preset.denominations.length - 1];
  const totalNotes = Object.values(breakdown).reduce((sum, q) => sum + Number(q || 0), 0) || 1;
  const isExactDenom = preset.denominations.includes(Number(amount));

  const theme =
    themes[amount] ||
    themes[baseDenom] || {
      bg: '#2D3748',
      paper: '#E2E8F0',
      ink: '#1A202C',
      strip: '#4A5568'
    };

  const stackLayers = isExactDenom ? 1 : totalNotes >= 4 ? 3 : totalNotes >= 2 ? 2 : 1;

  return {
    ...theme,
    symbol: preset.symbol,
    baseDenom: isExactDenom ? Number(amount) : baseDenom,
    totalNotes,
    isExactDenom,
    stackLayers
  };
}
