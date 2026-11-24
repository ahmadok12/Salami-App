import React, { useState, useEffect } from 'react';
import { formatCurrency, getTileVisualTheme } from '../config/defaults.js';

const IMAGE_EXTENSIONS = ['webp', 'png', 'jpg'];

export default function BanknoteTile({ amount, currency, onClick }) {
  const visual = getTileVisualTheme(amount, currency);
  const { bg, paper, ink, strip, baseDenom, totalNotes, isExactDenom, stackLayers, symbol } = visual;

  const [extIndex, setExtIndex] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);

  const currFolder = (currency || 'pkr').toLowerCase();

  // Reset image lookup whenever currency or base denomination changes
  useEffect(() => {
    setExtIndex(0);
    setImgLoaded(false);
  }, [currFolder, baseDenom]);

  const hasImageCandidate = extIndex < IMAGE_EXTENSIONS.length;
  const imgSrc = hasImageCandidate
    ? `./notes/${currFolder}/${baseDenom}.${IMAGE_EXTENSIONS[extIndex]}`
    : null;

  const isBundle = !isExactDenom && totalNotes > 1;

  return (
    <button
      type="button"
      onClick={() => onClick(amount)}
      style={{ backgroundColor: bg }}
      className="group relative flex flex-col items-center justify-between overflow-hidden rounded-[20px] px-2 pt-3.5 pb-2.5 text-white shadow-md ring-1 ring-black/10 transition-transform active:scale-[0.96]"
    >
      {/* Subtle top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />

      {/* Banknote Stack Area (consistent height across single & bundled tiles) */}
      <div className="relative mb-2 mt-1 w-full">
        {/* Back Stack Layer 3 (thick bundles like 4+ notes, e.g. Rs. 20,000) */}
        {stackLayers >= 3 && (
          <div
            aria-hidden="true"
            style={{ backgroundColor: paper }}
            className="pointer-events-none absolute inset-x-2.5 -top-3 bottom-2.5 overflow-hidden rounded-[6px] shadow-sm ring-1 ring-black/35 brightness-75"
          >
            {imgLoaded && imgSrc && (
              <img
                src={imgSrc}
                alt=""
                className="h-full w-full object-cover object-top"
              />
            )}
          </div>
        )}

        {/* Back Stack Layer 2 (2+ note bundles, e.g. Rs. 2,000 / 10,000 / 20,000) */}
        {stackLayers >= 2 && (
          <div
            aria-hidden="true"
            style={{ backgroundColor: paper }}
            className={`pointer-events-none absolute inset-x-1 overflow-hidden rounded-[6px] shadow-md ring-1 ring-black/35 brightness-90 ${
              stackLayers >= 3 ? '-top-1.5 bottom-1.5' : '-top-2 bottom-2'
            }`}
          >
            {imgLoaded && imgSrc && (
              <img
                src={imgSrc}
                alt=""
                className="h-full w-full object-cover object-top"
              />
            )}
          </div>
        )}

        {/* Primary Front Note Face — full uncropped note */}
        <div
          style={{
            backgroundColor: imgLoaded ? 'transparent' : paper,
            borderColor: imgLoaded ? 'transparent' : `${ink}35`
          }}
          className={`relative z-10 flex aspect-[2.35/1] w-full items-center justify-center rounded-[6px] ${
            imgLoaded ? '' : 'overflow-hidden border shadow-md'
          }`}
        >
          {/* Real banknote photo — object-contain displays 100% of the note with zero edge cropping */}
          {imgSrc && (
            <img
              src={imgSrc}
              alt={`${currency} ${baseDenom} banknote`}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                setImgLoaded(false);
                setExtIndex((prev) => prev + 1);
              }}
              className={`max-h-full max-w-full rounded-[6px] object-contain shadow-md ring-1 ring-black/25 transition-opacity duration-150 ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}

          {/* Fallback Stylized SVG Banknote (if no photo exists for this currency/denom) */}
          {!imgLoaded && (
            <div className="absolute inset-0">
              <svg
                viewBox="0 0 120 52"
                className="h-full w-full"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
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
                <rect x="86" y="0" width="3.5" height="52" fill={strip} fillOpacity="0.55" />
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

              <span
                style={{ color: ink }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-black tracking-tight opacity-85"
              >
                {symbol.trim()}
              </span>

              <span
                style={{ color: ink }}
                className="pointer-events-none absolute top-1 left-1.5 text-[9px] font-extrabold leading-none"
              >
                {baseDenom.toLocaleString()}
              </span>

              <span
                style={{ color: ink }}
                className="pointer-events-none absolute right-1.5 bottom-1 text-[9px] font-extrabold leading-none"
              >
                {isBundle ? `×${totalNotes}` : baseDenom.toLocaleString()}
              </span>
            </div>
          )}

          {/* Crisp Bundle Count Pill */}
          {imgLoaded && isBundle && (
            <span className="pointer-events-none absolute right-1 bottom-1 rounded-md bg-black/85 px-1.5 py-0.5 text-[9px] font-extrabold leading-none text-white ring-1 ring-white/45 shadow">
              ×{totalNotes}
            </span>
          )}
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
