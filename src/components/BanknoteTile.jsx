import React from 'react';
import { formatCurrency, getTileVisualTheme } from '../config/defaults.js';

export default function BanknoteTile({ amount, currency, onClick }) {
  const visual = getTileVisualTheme(amount, currency);
  const { bg, paper, ink, strip, baseDenom, totalNotes, isExactDenom, stackLayers, symbol } = visual;

  return (
    <button
      type="button"
      onClick={() => onClick(amount)}
      style={{ backgroundColor: bg }}
      className="group relative flex flex-col items-center justify-between overflow-hidden rounded-[20px] p-2.5 pt-2.5 text-white shadow-md ring-1 ring-black/10 transition-transform active:scale-[0.96]"
    >
      {/* Subtle top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />

      {/* Miniature Stylized Banknote Visual (100% offline SVG, crisp at any DPR) */}
      <div className="relative mb-2 w-full">
        {/* Stacked banknote edges for multi-note bundle amounts (e.g. 2,000 / 10,000 / 20,000) */}
        {stackLayers >= 3 && (
          <div
            style={{ backgroundColor: paper, borderColor: ink }}
            className="mx-2.5 -mb-[4px] h-1.5 rounded-t-[4px] border border-b-0 opacity-60"
          />
        )}
        {stackLayers >= 2 && (
          <div
            style={{ backgroundColor: paper, borderColor: ink }}
            className="mx-1.5 -mb-[3px] h-1.5 rounded-t-[5px] border border-b-0 opacity-85"
          />
        )}

        {/* Primary Note Face */}
        <div
          style={{ backgroundColor: paper, borderColor: `${ink}35` }}
          className="relative h-11 w-full overflow-hidden rounded-[8px] border shadow-sm"
        >
          <svg
            viewBox="0 0 120 52"
            className="h-full w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {/* Subtle guilloché background waves */}
            <path
              d="M0 38 Q30 22 60 36 T120 30 L120 52 L0 52 Z"
              fill={bg}
              fillOpacity="0.22"
            />
            <path
              d="M0 14 Q35 28 70 12 T120 18"
              fill="none"
              stroke={ink}
              strokeOpacity="0.18"
              strokeWidth="1.2"
            />
            <path
              d="M0 44 Q40 30 80 44 T120 40"
              fill="none"
              stroke={ink}
              strokeOpacity="0.16"
              strokeWidth="1"
            />

            {/* Vertical security thread */}
            <rect x="86" y="0" width="3.5" height="52" fill={strip} fillOpacity="0.55" />

            {/* Decorative watermark medallion */}
            <circle cx="60" cy="26" r="14" fill={bg} fillOpacity="0.22" />
            <circle
              cx="60"
              cy="26"
              r="11"
              fill="none"
              stroke={ink}
              strokeOpacity="0.35"
              strokeWidth="1"
              strokeDasharray="2 1.5"
            />

            {/* Corner micro-borders */}
            <rect
              x="3"
              y="3"
              width="114"
              height="46"
              rx="4"
              fill="none"
              stroke={ink}
              strokeOpacity="0.28"
              strokeWidth="1"
            />
          </svg>

          {/* Center Currency Symbol Emblem */}
          <span
            style={{ color: ink }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-black tracking-tight opacity-85"
          >
            {symbol.trim()}
          </span>

          {/* Top-left Denomination Numeral */}
          <span
            style={{ color: ink }}
            className="pointer-events-none absolute top-1 left-1.5 text-[9px] font-extrabold leading-none"
          >
            {baseDenom.toLocaleString()}
          </span>

          {/* Bottom-right Denomination or Bundle Multiplier */}
          <span
            style={{ color: ink }}
            className="pointer-events-none absolute right-1.5 bottom-1 text-[9px] font-extrabold leading-none"
          >
            {!isExactDenom && totalNotes > 1 ? `×${totalNotes}` : baseDenom.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Crisp Bold Amount Label */}
      <div className="relative z-10 text-center leading-tight">
        <div className="text-[17px] font-extrabold tracking-tight text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">
          +{amount.toLocaleString()}
        </div>
        <div className="mt-0.5 text-[10px] font-semibold text-white/85">
          {formatCurrency(amount, currency)}
        </div>
      </div>
    </button>
  );
}
