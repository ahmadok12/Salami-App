import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Delete } from 'lucide-react';
import { CURRENCY_PRESETS, formatCurrency } from '../config/defaults.js';

export default function EnvelopeClearSheet({ entry, remainingCount, currency, onClose, onSaveAndNext }) {
  const [digits, setDigits] = useState('');
  const preset = CURRENCY_PRESETS[currency] || CURRENCY_PRESETS.PKR;

  useEffect(() => {
    setDigits('');
  }, [entry?.id]);

  if (!entry) return null;

  const numericAmount = Number(digits) || 0;

  const tapKey = (k) => {
    if (k === 'DEL') {
      setDigits((prev) => prev.slice(0, -1));
    } else if (k === '00') {
      setDigits((prev) => (prev ? (prev + '00').slice(0, 8) : ''));
    } else {
      setDigits((prev) => (prev + k).slice(0, 8));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px]">
      <div className="w-full max-w-[430px] rounded-t-[32px] bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <span className="inline-block rounded-full bg-[#FF7A00]/15 px-3 py-1 text-xs font-bold text-[#FF7A00]">
              Envelope {entry.envelope_no} • {remainingCount} Pending
            </span>
            <h3 className="mt-1.5 text-xl font-extrabold text-[#111111]">{entry.guest_name}</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F6F6F6]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-2xl bg-[#F6F6F6] px-4 py-4 text-center">
          <div className="text-3xl font-extrabold tracking-tight text-[#111111]">
            {formatCurrency(numericAmount, currency)}
          </div>
        </div>

        {/* Quick Chips */}
        <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {preset.quickChips.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setDigits(String(numericAmount + amt))}
              className="shrink-0 rounded-full bg-[#F6F6F6] px-3.5 py-2 text-xs font-bold text-[#111111] active:bg-[#111111] active:text-white"
            >
              +{amt.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Numeric Keypad */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'DEL'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => tapKey(k)}
              className="flex h-12 items-center justify-center rounded-2xl bg-[#F6F6F6] text-lg font-bold text-[#111111] active:bg-neutral-200"
            >
              {k === 'DEL' ? <Delete className="h-5 w-5" /> : k}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={numericAmount <= 0}
          onClick={() => onSaveAndNext(entry, numericAmount)}
          className="flex w-full items-center justify-between rounded-[22px] bg-[#FF7A00] px-5 py-3.5 text-white shadow-lg shadow-[#FF7A00]/25 disabled:opacity-40"
        >
          <span className="text-sm font-extrabold">
            {remainingCount > 1 ? 'Save Amount & Next Pending' : 'Save Amount & Finish'}
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111111] text-white">
            <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      </div>
    </div>
  );
}
