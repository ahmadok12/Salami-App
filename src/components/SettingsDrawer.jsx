import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { CURRENCY_PRESETS } from '../config/defaults.js';

function ChipEditor({ label, items, onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  const addChip = () => {
    const val = draft.trim();
    if (!val || items.includes(val)) return;
    onChange([...items, val]);
    setDraft('');
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-full bg-[#F6F6F6] px-3 py-1.5 text-xs font-semibold text-[#111111]"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((i) => i !== item))}
              className="ml-0.5 text-neutral-400 hover:text-red-500"
              aria-label={`Remove ${item}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChip())}
          placeholder={placeholder}
          className="flex-1 rounded-2xl bg-[#F6F6F6] px-3.5 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#111111]"
        />
        <button
          type="button"
          onClick={addChip}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111111] text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}


function AmountChipEditor({ currency, items, onChange }) {
  const [draft, setDraft] = useState('');
  const preset = CURRENCY_PRESETS[currency] || CURRENCY_PRESETS.PKR;
  const activeItems = Array.isArray(items) && items.length > 0 ? items : preset.quickChips;

  const addAmount = () => {
    const num = parseInt(draft.replace(/[^0-9]/g, ''), 10);
    if (!num || num <= 0 || activeItems.includes(num)) return;
    onChange([...activeItems, num].sort((a, b) => a - b));
    setDraft('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          Quick Amount Tiles ({currency})
        </label>
        <button
          type="button"
          onClick={() => onChange([...preset.quickChips])}
          className="text-[11px] font-bold text-[#FF7A00]"
        >
          Reset defaults
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {activeItems.map((val) => (
          <span
            key={val}
            className="inline-flex items-center gap-1 rounded-full bg-[#F6F6F6] px-3.5 py-1.5 text-xs font-bold text-[#111111]"
          >
            +{val.toLocaleString()}
            <button
              type="button"
              onClick={() => {
                const next = activeItems.filter((i) => i !== val);
                if (next.length > 0) onChange(next);
              }}
              className="ml-0.5 text-neutral-400 hover:text-red-500"
              aria-label={`Remove ${val}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAmount())}
          placeholder={`Add tile amount (e.g. ${preset.quickChips[0]})`}
          className="flex-1 rounded-2xl bg-[#F6F6F6] px-3.5 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#111111]"
        />
        <button
          type="button"
          onClick={addAmount}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111111] text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function SettingsDrawer({ open, onClose, config, onSaveConfig }) {
  const [draft, setDraft] = useState(config);

  React.useEffect(() => {
    if (open) setDraft(config);
  }, [open, config]);

  if (!open) return null;

  const handleSave = () => {
    onSaveConfig(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center">
      <div className="max-h-[90vh] w-full max-w-[430px] overflow-y-auto rounded-t-[32px] bg-white p-6 shadow-2xl sm:rounded-[32px]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Wedding Settings</h2>
            <p className="text-xs font-medium text-neutral-500">Synced via the _Config Sheet tab</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6F6F6] text-[#111111]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Wedding Title</label>
            <input
              type="text"
              value={draft.wedding_title}
              onChange={(e) => setDraft({ ...draft, wedding_title: e.target.value })}
              className="w-full rounded-2xl bg-[#F6F6F6] px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#111111]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Collector Name</label>
              <input
                type="text"
                value={draft.active_collector}
                onChange={(e) => setDraft({ ...draft, active_collector: e.target.value })}
                className="w-full rounded-2xl bg-[#F6F6F6] px-3.5 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#111111]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Envelope Prefix</label>
              <input
                type="text"
                value={draft.envelope_prefix}
                placeholder="e.g. A-, M-, W-"
                onChange={(e) => setDraft({ ...draft, envelope_prefix: e.target.value })}
                className="w-full rounded-2xl bg-[#F6F6F6] px-3.5 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#111111]"
              />
            </div>
          </div>

          {/* Home Screen Optional Fields Toggles */}
          <div className="space-y-2.5 rounded-[22px] bg-[#F6F6F6] p-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Home Screen Optional Fields
              </label>
              <p className="mt-0.5 text-[11px] font-medium text-neutral-400">
                Keep off for a clean, single-screen fast entry view.
              </p>
            </div>
            <div className="space-y-2 pt-1">
              {[
                { key: 'group', label: 'Group / Relation' },
                { key: 'event', label: 'Event (Mehndi / Barat / Walima)' },
                { key: 'side', label: 'Side (Groom / Bride)' },
                { key: 'city', label: 'City' },
                { key: 'note', label: 'Note' }
              ].map(({ key, label }) => {
                const enabled = Boolean(draft.visible_fields?.[key]);
                return (
                  <div
                    key={key}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        visible_fields: {
                          ...(draft.visible_fields || {}),
                          [key]: !enabled
                        }
                      })
                    }
                    className="flex cursor-pointer items-center justify-between rounded-2xl bg-white px-3.5 py-2.5"
                  >
                    <span className="text-xs font-bold text-[#111111]">{label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                        enabled ? 'bg-[#FF7A00]' : 'bg-neutral-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Currency & Notes</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(CURRENCY_PRESETS).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      currency: code,
                      quick_chips: [...CURRENCY_PRESETS[code].quickChips]
                    })
                  }
                  className={`rounded-2xl py-2.5 text-sm font-bold transition ${
                    draft.currency === code
                      ? 'bg-[#111111] text-white'
                      : 'bg-[#F6F6F6] text-[#111111]'
                  }`}
                >
                  {code} ({CURRENCY_PRESETS[code].symbol})
                </button>
              ))}
            </div>
          </div>

          <AmountChipEditor
            currency={draft.currency}
            items={draft.quick_chips}
            onChange={(quick_chips) => setDraft({ ...draft, quick_chips })}
          />

          <ChipEditor
            label="Honorific Prefixes"
            items={draft.honorifics}
            onChange={(honorifics) => setDraft({ ...draft, honorifics })}
            placeholder="Add prefix (e.g. Khan, Syed)"
          />

          <ChipEditor
            label="Events"
            items={draft.events}
            onChange={(events) => setDraft({ ...draft, events })}
            placeholder="Add event (e.g. Dholki, Nikkah)"
          />

          <ChipEditor
            label="Groups / Relations"
            items={draft.groups}
            onChange={(groups) => setDraft({ ...draft, groups })}
            placeholder="Add group (e.g. Baradari)"
          />

          <ChipEditor
            label="Sides"
            items={draft.sides}
            onChange={(sides) => setDraft({ ...draft, sides })}
            placeholder="Add side"
          />

          <button
            type="button"
            onClick={handleSave}
            className="mt-2 w-full rounded-full bg-[#FF7A00] py-4 text-base font-extrabold text-white shadow-lg shadow-[#FF7A00]/25 active:scale-[0.99]"
          >
            Save Wedding Settings
          </button>
        </div>
      </div>
    </div>
  );
}
