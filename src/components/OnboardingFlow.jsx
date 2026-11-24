import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { CURRENCY_PRESETS, buildWeddingTitle } from '../config/defaults.js';

export default function OnboardingFlow({ initialConfig, onComplete }) {
  const [step, setStep] = useState(1); // 1: Couple & Collector | 2: Currency & Prefix
  const [groomName, setGroomName] = useState(initialConfig.groom_name || '');
  const [brideName, setBrideName] = useState(initialConfig.bride_name || '');
  const [collectorName, setCollectorName] = useState(
    initialConfig.active_collector === 'Collector 1' ? '' : initialConfig.active_collector || ''
  );
  const [currency, setCurrency] = useState(initialConfig.currency || 'PKR');
  const [envelopePrefix, setEnvelopePrefix] = useState(initialConfig.envelope_prefix ?? 'A-');

  const computedTitle = buildWeddingTitle(groomName, brideName, 'Wedding Salami');
  const selectedPreset = CURRENCY_PRESETS[currency] || CURRENCY_PRESETS.PKR;

  const finishSetup = () => {
    onComplete({
      ...initialConfig,
      groom_name: groomName.trim(),
      bride_name: brideName.trim(),
      wedding_title: computedTitle,
      active_collector: collectorName.trim() || 'Collector 1',
      currency,
      quick_chips: [...selectedPreset.quickChips],
      envelope_prefix: envelopePrefix.trim()
    });
  };

  return (
    <div className="flex min-h-screen w-full flex-col justify-between bg-white px-6 pt-8 pb-8 sm:min-h-[844px]">
      <div>
        {/* Top Progress Bar & Skip */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 rounded-full transition-all ${
                step === 1 ? 'w-7 bg-[#4B006E]' : 'w-2 bg-[#4B006E]/25'
              }`}
            />
            <span
              className={`h-2 rounded-full transition-all ${
                step === 2 ? 'w-7 bg-[#4B006E]' : 'w-2 bg-[#4B006E]/25'
              }`}
            />
          </div>

          <button
            type="button"
            onClick={finishSetup}
            className="text-xs font-bold text-neutral-400 hover:text-[#111111]"
          >
            Skip
          </button>
        </div>

        {/* Brand Logo */}
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="./logo.png" alt="Salami" className="h-auto w-32 object-contain" />
        </div>

        {/* ================= STEP 1: GROOM / BRIDE DETAILS ================= */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#111111]">
                Welcome! Let&apos;s set up the wedding
              </h1>
              <p className="mt-1 text-xs font-medium text-neutral-500">
                Takes 10 seconds — you can change everything later in Settings.
              </p>
            </div>

            <div className="space-y-3.5 rounded-[24px] bg-[#F6F6F6] p-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Groom&apos;s Name
                </label>
                <input
                  type="text"
                  value={groomName}
                  onChange={(e) => setGroomName(e.target.value)}
                  placeholder="e.g. Ali"
                  autoFocus
                  className="w-full rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-[#111111] outline-none focus:ring-2 focus:ring-[#4B006E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Bride&apos;s Name
                </label>
                <input
                  type="text"
                  value={brideName}
                  onChange={(e) => setBrideName(e.target.value)}
                  placeholder="e.g. Ayesha"
                  className="w-full rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-[#111111] outline-none focus:ring-2 focus:ring-[#4B006E]"
                />
              </div>

              {(groomName.trim() || brideName.trim()) && (
                <div className="rounded-xl bg-[#4B006E]/10 px-3.5 py-2 text-center text-xs font-extrabold text-[#4B006E]">
                  Ledger Title: {computedTitle}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Your Name / Collector (Optional)
              </label>
              <input
                type="text"
                value={collectorName}
                onChange={(e) => setCollectorName(e.target.value)}
                placeholder="e.g. Usman (Gate 1)"
                className="w-full rounded-2xl bg-[#F6F6F6] px-4 py-3.5 text-sm font-semibold text-[#111111] outline-none focus:ring-2 focus:ring-[#111111]"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 2: CURRENCY & PREFIX ================= */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#111111]">
                Choose your currency
              </h1>
              <p className="mt-1 text-xs font-medium text-neutral-500">
                Sets quick-tap banknote tiles &amp; cash denomination totals.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {Object.keys(CURRENCY_PRESETS).map((code) => {
                const preset = CURRENCY_PRESETS[code];
                const active = currency === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCurrency(code)}
                    className={`relative flex items-center justify-between rounded-[20px] px-4 py-3.5 text-left transition active:scale-[0.98] ${
                      active
                        ? 'bg-[#111111] text-white shadow-md'
                        : 'bg-[#F6F6F6] text-[#111111]'
                    }`}
                  >
                    <div>
                      <div className="text-base font-extrabold">{code}</div>
                      <div
                        className={`text-xs font-semibold ${
                          active ? 'text-neutral-300' : 'text-neutral-400'
                        }`}
                      >
                        {preset.symbol}
                      </div>
                    </div>
                    {active && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF7A00] text-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Preview of default chips for selected currency */}
            <div className="rounded-2xl bg-[#F6F6F6] p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Default Quick Chips ({currency})
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedPreset.quickChips.map((amt) => (
                  <span
                    key={amt}
                    className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#111111]"
                  >
                    +{amt.toLocaleString()}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Envelope Serial Prefix (Optional)
              </label>
              <input
                type="text"
                value={envelopePrefix}
                onChange={(e) => setEnvelopePrefix(e.target.value)}
                placeholder="e.g. A-, M-, W- (or leave blank)"
                className="w-full rounded-2xl bg-[#F6F6F6] px-4 py-3 text-sm font-semibold text-[#111111] outline-none focus:ring-2 focus:ring-[#111111]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="mt-6 flex items-center gap-2.5">
        {step === 2 && (
          <button
            type="button"
            onClick={() => setStep(1)}
            aria-label="Back"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-[#F6F6F6] text-[#111111] active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        {step === 1 ? (
          <button
            type="button"
            onClick={() => setStep(2)}
            className="flex flex-1 items-center justify-between rounded-[24px] bg-[#FF7A00] px-5 py-3.5 text-white shadow-lg shadow-[#FF7A00]/25 active:scale-[0.99]"
          >
            <span className="text-base font-extrabold">Continue</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-white">
              <ArrowRight className="h-5 w-5" />
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={finishSetup}
            className="flex flex-1 items-center justify-between rounded-[24px] bg-[#FF7A00] px-5 py-3.5 text-white shadow-lg shadow-[#FF7A00]/25 active:scale-[0.99]"
          >
            <div className="text-left">
              <div className="text-base font-extrabold">Start Collecting</div>
              <div className="text-[11px] font-medium text-white/85">
                Works offline • Connect Google Sheet anytime
              </div>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-white">
              <ArrowRight className="h-5 w-5" />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
