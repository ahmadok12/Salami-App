import React from 'react';

export default function Preloader({ fadingOut }) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-opacity duration-300 sm:absolute sm:rounded-[44px] ${
        fadingOut ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* Subtle purple & gold ambient glow */}
      <div className="pointer-events-none absolute h-64 w-64 rounded-full bg-[#4B006E]/[0.06] blur-3xl" />

      <div className="relative flex flex-col items-center px-8 text-center animate-logo-in">
        <img
          src="./logo.png"
          alt="Salami"
          className="h-auto w-44 object-contain drop-shadow-sm"
        />

        <p className="mt-4 text-xs font-bold tracking-widest uppercase text-[#4B006E]/60">
          Wedding Salami Ledger
        </p>

        {/* Sleek animated loading bar */}
        <div className="mt-6 h-1.5 w-36 overflow-hidden rounded-full bg-[#4B006E]/10">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#4B006E] via-[#FF7A00] to-[#E89E24] animate-shimmer-bar" />
        </div>
      </div>

      <p className="absolute bottom-8 text-[11px] font-semibold text-neutral-400">
        Offline-first • Synced to your Google Sheet
      </p>
    </div>
  );
}
