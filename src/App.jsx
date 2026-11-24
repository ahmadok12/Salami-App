import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Settings, Mic, MicOff, ArrowRight, Home, ListChecks, BarChart3,
  FileSpreadsheet, Plus, Search, Download, RefreshCw, Cloud, CloudOff,
  CheckCircle2, ExternalLink, FolderOpen, AlertTriangle, Undo2
} from 'lucide-react';
import {
  CURRENCY_PRESETS,
  DEFAULT_CONFIG,
  LEDGER_HEADERS,
  formatCurrency,
  breakdownAmountToNotes,
  serializeNotesBreakdown,
  parseNotesBreakdown,
  generateEntryId
} from './config/defaults.js';
import {
  loadLocalConfig,
  saveLocalConfig,
  loadSheetMeta,
  saveSheetMeta,
  getAllEntries,
  addEntryOfflineFirst,
  updateEntryOfflineFirst,
  deleteEntryOfflineFirst,
  getPendingQueueCount,
  requestPersistentStorage,
  upsertSyncedEntries
} from './db/indexedDb.js';
import { isGoogleConfigured, signInWithGoogle, getAccessToken } from './services/googleAuth.js';
import {
  createWeddingSpreadsheet,
  openGooglePicker,
  fetchLedgerAndConfig
} from './services/googleSheets.js';
import { processSyncQueue, exportEntriesToCSV } from './services/syncEngine.js';
import SettingsDrawer from './components/SettingsDrawer.jsx';
import EnvelopeClearSheet from './components/EnvelopeClearSheet.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('collect'); // collect | ledger | summary | sheet
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [entries, setEntries] = useState([]);
  const [sheetMeta, setSheetMeta] = useState({ spreadsheetId: null, spreadsheetName: null, spreadsheetUrl: null });
  const [googleUser, setGoogleUser] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingQueue, setPendingQueue] = useState(0);
  const [syncingNow, setSyncingNow] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Collect form state (all optional fields deselected by default)
  const [mode, setMode] = useState('Cash'); // Cash | Envelope
  const [amount, setAmount] = useState(0);
  const [notesMap, setNotesMap] = useState({});
  const [customAmountInput, setCustomAmountInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedSide, setSelectedSide] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [note, setNote] = useState('');
  const [listening, setListening] = useState(false);

  // Ledger / Summary / Sheet tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [ledgerFilter, setLedgerFilter] = useState('All');
  const [clearingEntry, setClearingEntry] = useState(null);
  const [summaryCollector, setSummaryCollector] = useState('All');
  const [sheetPreviewTab, setSheetPreviewTab] = useState('Ledger');

  // Toast with Undo
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const nameInputRef = useRef(null);

  const currencyPreset = CURRENCY_PRESETS[config.currency] || CURRENCY_PRESETS.PKR;

  // Boot: load IndexedDB, request persistent storage, listen to online/offline
  useEffect(() => {
    (async () => {
      await requestPersistentStorage();
      const [cfg, meta, savedEntries, qCount] = await Promise.all([
        loadLocalConfig(),
        loadSheetMeta(),
        getAllEntries(),
        getPendingQueueCount()
      ]);
      setConfig(cfg);
      setSheetMeta(meta);
      setEntries(savedEntries);
      setPendingQueue(qCount);
    })();

    const onOnline = async () => {
      setIsOnline(true);
      const res = await processSyncQueue();
      setPendingQueue(res.remaining);
      setEntries(await getAllEntries());
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const showToast = (message, undoEntryId = null) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, undoEntryId });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  // Next auto-incrementing envelope number scoped to device prefix
  const nextEnvelopeNo = useMemo(() => {
    const prefix = config.envelope_prefix || '';
    let maxNum = 0;
    entries.forEach((e) => {
      if (e.envelope_no && e.envelope_no.startsWith(prefix)) {
        const numPart = parseInt(e.envelope_no.slice(prefix.length).replace(/^#/, ''), 10);
        if (!Number.isNaN(numPart) && numPart > maxNum) maxNum = numPart;
      }
    });
    return `${prefix}${maxNum + 1}`;
  }, [entries, config.envelope_prefix]);

  // Auto-adaptive cities (most frequent floated to front)
  const adaptiveCities = useMemo(() => {
    const counts = {};
    entries.forEach((e) => {
      if (e.city) counts[e.city] = (counts[e.city] || 0) + 1;
    });
    const merged = Array.from(new Set([...Object.keys(counts), ...(config.cities_adaptive || [])]));
    return merged.sort((a, b) => (counts[b] || 0) - (counts[a] || 0)).slice(0, 6);
  }, [entries, config.cities_adaptive]);

  // Smart autocomplete suggestions for guest names
  const nameSuggestions = useMemo(() => {
    const q = guestName.trim().toLowerCase();
    if (q.length < 2) return [];
    const unique = Array.from(new Set(entries.map((e) => e.guest_name)));
    return unique.filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q).slice(0, 4);
  }, [guestName, entries]);

  // Duplicate warning within last 2 minutes
  const recentDuplicate = useMemo(() => {
    const q = guestName.trim().toLowerCase();
    if (q.length < 3) return null;
    const twoMinAgo = Date.now() - 2 * 60 * 1000;
    return entries.find(
      (e) => e.guest_name.toLowerCase() === q && new Date(e.timestamp).getTime() > twoMinAgo
    );
  }, [guestName, entries]);

  const tapQuickChip = (chipVal) => {
    setShowCustomInput(false);
    const nextAmount = amount + chipVal;
    setAmount(nextAmount);
    const updatedNotes = { ...notesMap };
    if (currencyPreset.denominations.includes(chipVal)) {
      updatedNotes[chipVal] = (updatedNotes[chipVal] || 0) + 1;
    } else {
      const broken = breakdownAmountToNotes(chipVal, config.currency);
      Object.entries(broken).forEach(([d, q]) => {
        updatedNotes[d] = (updatedNotes[d] || 0) + q;
      });
    }
    setNotesMap(updatedNotes);
  };

  const applyCustomAmount = (valStr) => {
    setCustomAmountInput(valStr);
    const num = Math.max(0, parseInt(valStr.replace(/[^0-9]/g, ''), 10) || 0);
    setAmount(num);
    setNotesMap(breakdownAmountToNotes(num, config.currency));
  };

  const tapHonorific = (prefix) => {
    setGuestName((prev) => {
      const trimmed = prev.trim();
      if (trimmed.toLowerCase().startsWith(prefix.toLowerCase() + ' ')) return prev;
      return `${prefix} ${trimmed}`.trimStart();
    });
    nameInputRef.current?.focus();
  };

  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice input is not supported in this browser.');
      return;
    }
    if (listening) {
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-PK';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setGuestName((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const resetCollectForm = () => {
    setAmount(0);
    setNotesMap({});
    setCustomAmountInput('');
    setShowCustomInput(false);
    setGuestName('');
    setSelectedGroup('');
    setSelectedEvent('');
    setSelectedSide('');
    setSelectedCity('');
    setCustomCity('');
    setNote('');
  };

  const handleSaveAndNext = async () => {
    const trimmedName = guestName.trim();
    if (!trimmedName) {
      showToast('Please enter Guest Name.');
      return;
    }
    if (mode === 'Cash' && amount <= 0) {
      showToast('Please tap an amount.');
      return;
    }

    const finalCity = customCity.trim() || selectedCity;
    const isEnvelope = mode === 'Envelope';
    const breakdown = isEnvelope ? '' : serializeNotesBreakdown(notesMap);

    const entry = {
      id: generateEntryId(),
      timestamp: new Date().toISOString(),
      guest_name: trimmedName,
      amount: isEnvelope ? null : amount,
      currency: config.currency,
      mode,
      envelope_no: isEnvelope ? nextEnvelopeNo : '',
      status: isEnvelope ? 'Pending' : 'Collected',
      notes_breakdown: breakdown,
      notes_map: isEnvelope ? {} : notesMap,
      collected_by: googleUser?.name || config.active_collector || 'Collector 1',
      event: selectedEvent,
      group: selectedGroup,
      side: selectedSide,
      city: finalCity,
      note: note.trim()
    };

    await addEntryOfflineFirst(entry);
    setEntries(await getAllEntries());
    setPendingQueue(await getPendingQueueCount());
    resetCollectForm();

    showToast(
      isEnvelope
        ? `Saved Envelope ${entry.envelope_no} — ${entry.guest_name}`
        : `Saved ${entry.guest_name} — ${formatCurrency(entry.amount, entry.currency)}`,
      entry.id
    );

    // Trigger background sync if online & connected
    const res = await processSyncQueue();
    setPendingQueue(res.remaining);
    if (res.synced > 0) setEntries(await getAllEntries());
  };

  const handleUndo = async (entryId) => {
    await deleteEntryOfflineFirst(entryId);
    setEntries(await getAllEntries());
    setPendingQueue(await getPendingQueueCount());
    setToast(null);
  };

  const handleClearEnvelope = async (entry, clearedAmount) => {
    const breakdownObj = breakdownAmountToNotes(clearedAmount, entry.currency || config.currency);
    const updated = {
      ...entry,
      amount: clearedAmount,
      status: 'Collected',
      notes_breakdown: serializeNotesBreakdown(breakdownObj),
      notes_map: breakdownObj
    };
    await updateEntryOfflineFirst(updated);
    const freshEntries = await getAllEntries();
    setEntries(freshEntries);
    setPendingQueue(await getPendingQueueCount());

    const nextPending = freshEntries.find((e) => e.status === 'Pending' && e.id !== entry.id);
    setClearingEntry(nextPending || null);
    showToast(`Cleared ${entry.envelope_no} — ${formatCurrency(clearedAmount, updated.currency)}`);

    const res = await processSyncQueue();
    setPendingQueue(res.remaining);
    if (res.synced > 0) setEntries(await getAllEntries());
  };

  const handleSaveConfig = async (newCfg) => {
    const saved = await saveLocalConfig(newCfg, true);
    setConfig(saved);
    setPendingQueue(await getPendingQueueCount());
    showToast('Wedding settings saved.');
    const res = await processSyncQueue();
    setPendingQueue(res.remaining);
  };

  // Google Auth & Sheet Actions
  const handleGoogleSignIn = async () => {
    try {
      const { user } = await signInWithGoogle();
      setGoogleUser(user);
      if (user.name) {
        const updated = await saveLocalConfig({ ...config, active_collector: user.name }, false);
        setConfig(updated);
      }
      showToast(`Signed in as ${user.name}`);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleCreateSheet = async () => {
    const token = getAccessToken();
    if (!token) {
      showToast('Sign in with Google first.');
      return;
    }
    try {
      setSyncingNow(true);
      const meta = await createWeddingSpreadsheet(token, config);
      await saveSheetMeta(meta);
      setSheetMeta(meta);
      const res = await processSyncQueue();
      setPendingQueue(res.remaining);
      setEntries(await getAllEntries());
      showToast('Wedding Google Sheet created & linked!');
    } catch (err) {
      showToast(err.message);
    } finally {
      setSyncingNow(false);
    }
  };

  const handleJoinSharedSheet = async () => {
    const token = getAccessToken();
    if (!token) {
      showToast('Sign in with Google first.');
      return;
    }
    try {
      const picked = await openGooglePicker(token);
      if (!picked) return;
      setSyncingNow(true);
      await saveSheetMeta(picked);
      setSheetMeta(picked);
      const remote = await fetchLedgerAndConfig(token, picked.spreadsheetId);
      if (remote.config && Object.keys(remote.config).length > 0) {
        const mergedCfg = await saveLocalConfig({ ...config, ...remote.config }, false);
        setConfig(mergedCfg);
      }
      await upsertSyncedEntries(remote.entries);
      setEntries(await getAllEntries());
      showToast(`Connected to ${picked.spreadsheetName}`);
    } catch (err) {
      showToast(err.message);
    } finally {
      setSyncingNow(false);
    }
  };

  const handleManualSync = async () => {
    setSyncingNow(true);
    const res = await processSyncQueue();
    setPendingQueue(res.remaining);
    setEntries(await getAllEntries());
    setSyncingNow(false);
    if (res.offline) showToast('Offline — entries safely stored on device.');
    else if (res.localOnly) showToast('Local Mode — connect a Google Sheet to sync.');
    else showToast(`Synced ${res.synced} item(s) to Google Sheets.`);
  };

  // Derived metrics
  const pendingEnvelopes = useMemo(() => entries.filter((e) => e.status === 'Pending'), [entries]);
  const collectors = useMemo(
    () => Array.from(new Set(entries.map((e) => e.collected_by).filter(Boolean))),
    [entries]
  );

  const filteredLedger = useMemo(() => {
    return entries.filter((e) => {
      if (ledgerFilter === 'Pending' && e.status !== 'Pending') return false;
      if (ledgerFilter !== 'All' && ledgerFilter !== 'Pending' && e.event !== ledgerFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.guest_name.toLowerCase().includes(q) ||
          (e.envelope_no || '').toLowerCase().includes(q) ||
          (e.city || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entries, ledgerFilter, searchQuery]);

  const summaryStats = useMemo(() => {
    const scoped =
      summaryCollector === 'All'
        ? entries
        : entries.filter((e) => e.collected_by === summaryCollector);

    let totalAmount = 0;
    let totalNotes = 0;
    const denomCounts = {};
    currencyPreset.denominations.forEach((d) => {
      denomCounts[d] = 0;
    });

    scoped.forEach((e) => {
      if (e.status === 'Collected' && e.amount) {
        totalAmount += Number(e.amount);
        const map =
          e.notes_map && Object.keys(e.notes_map).length > 0
            ? e.notes_map
            : parseNotesBreakdown(e.notes_breakdown || '');
        const resolved =
          Object.keys(map).length > 0 ? map : breakdownAmountToNotes(e.amount, e.currency || config.currency);
        Object.entries(resolved).forEach(([d, q]) => {
          const denom = Number(d);
          const qty = Number(q);
          denomCounts[denom] = (denomCounts[denom] || 0) + qty;
          totalNotes += qty;
        });
      }
    });

    const totalEnvelopes = scoped.filter((e) => e.mode === 'Envelope').length;
    const clearedEnvelopes = scoped.filter((e) => e.mode === 'Envelope' && e.status === 'Collected').length;

    return {
      totalAmount,
      guestCount: scoped.length,
      pendingCount: scoped.filter((e) => e.status === 'Pending').length,
      totalEnvelopes,
      clearedEnvelopes,
      totalNotes,
      denomCounts
    };
  }, [entries, summaryCollector, currencyPreset, config.currency]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F2D5BB] sm:py-6">
      {/* Mobile Shell */}
      <div className="relative flex min-h-screen w-full max-w-[430px] flex-col bg-white shadow-2xl sm:min-h-[844px] sm:rounded-[44px] sm:overflow-hidden">
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 left-1/2 z-50 flex w-[92%] max-w-[390px] -translate-x-1/2 items-center justify-between rounded-2xl bg-[#111111] px-4 py-3 text-xs font-semibold text-white shadow-xl">
            <span className="truncate pr-2">{toast.message}</span>
            {toast.undoEntryId && (
              <button
                onClick={() => handleUndo(toast.undoEntryId)}
                className="flex shrink-0 items-center gap-1 rounded-full bg-[#FF7A00] px-3 py-1 text-xs font-bold text-white"
              >
                <Undo2 className="h-3 w-3" /> Undo
              </button>
            )}
          </div>
        )}

        {/* Top Header */}
        <header className="flex items-center justify-between px-6 pt-6 pb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              {config.wedding_title}
            </p>
            <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-[#111111]">
              {activeTab === 'collect' && 'Collect Salami'}
              {activeTab === 'ledger' && 'My Ledger'}
              {activeTab === 'summary' && 'Summary'}
              {activeTab === 'sheet' && 'Google Sheet'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('sheet')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                !isOnline
                  ? 'bg-amber-100 text-amber-800'
                  : sheetMeta.spreadsheetId && pendingQueue === 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-[#F6F6F6] text-[#111111]'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  !isOnline ? 'bg-amber-500' : sheetMeta.spreadsheetId ? 'bg-emerald-500' : 'bg-[#FF7A00]'
                }`}
              />
              {!isOnline
                ? `Offline (${pendingQueue})`
                : sheetMeta.spreadsheetId
                ? pendingQueue > 0
                  ? `${pendingQueue} Pending`
                  : 'Synced'
                : 'Local PWA'}
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Wedding Settings"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6F6F6] text-[#111111] active:scale-95"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto px-6 pb-28">
          {/* ================= COLLECT TAB ================= */}
          {activeTab === 'collect' && (
            <div className="space-y-5">
              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-1.5 rounded-full bg-[#F6F6F6] p-1">
                {['Cash', 'Envelope'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-full py-2.5 text-sm font-bold transition ${
                      mode === m ? 'bg-[#111111] text-white shadow-sm' : 'text-neutral-500'
                    }`}
                  >
                    {m === 'Cash' ? '💵 Cash' : '✉️ Sealed Envelope'}
                  </button>
                ))}
              </div>

              {/* Amount Card or Envelope Serial Card */}
              {mode === 'Cash' ? (
                <div className="rounded-[24px] bg-[#F6F6F6] p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Amount ({config.currency}) *
                    </span>
                    {amount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAmount(0);
                          setNotesMap({});
                          setCustomAmountInput('');
                        }}
                        className="text-xs font-bold text-[#FF7A00]"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-4xl font-extrabold tracking-tight text-[#111111]">
                      {formatCurrency(amount, config.currency)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCustomInput((v) => !v)}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#111111] shadow-sm"
                    >
                      {showCustomInput ? 'Chips' : 'Custom'}
                    </button>
                  </div>

                  {Object.keys(notesMap).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(notesMap)
                        .filter(([, q]) => q > 0)
                        .sort((a, b) => Number(b[0]) - Number(a[0]))
                        .map(([d, q]) => (
                          <span
                            key={d}
                            className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-neutral-600"
                          >
                            {Number(d).toLocaleString()} × {q}
                          </span>
                        ))}
                    </div>
                  )}

                  {showCustomInput ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={customAmountInput}
                      onChange={(e) => applyCustomAmount(e.target.value)}
                      placeholder="Enter custom amount..."
                      className="mt-3 w-full rounded-2xl bg-white px-4 py-3 text-base font-bold outline-none ring-2 ring-[#111111]"
                    />
                  ) : (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {currencyPreset.quickChips.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => tapQuickChip(val)}
                          className="h-12 rounded-2xl bg-white text-sm font-extrabold text-[#111111] shadow-sm active:scale-95 active:bg-[#111111] active:text-white"
                        >
                          +{val.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-[24px] bg-[#111111] p-5 text-white">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Write on Envelope
                  </span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-4xl font-extrabold text-[#FF7A00]">#{nextEnvelopeNo}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-neutral-200">
                      Amount Pending
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-400">
                    Mark this number on the sealed lifafa and clear the amount later in Ledger.
                  </p>
                </div>
              )}

              {/* Guest Name + Honorifics (Starting from Haji) */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Guest Name *
                </label>

                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {config.honorifics.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => tapHonorific(h)}
                      className="shrink-0 rounded-full bg-[#F6F6F6] px-3.5 py-2 text-xs font-bold text-[#111111] active:bg-[#111111] active:text-white"
                    >
                      {h}
                    </button>
                  ))}
                </div>

                <div className="relative flex items-center">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Tap prefix or type / speak name..."
                    className="w-full rounded-2xl bg-[#F6F6F6] py-3.5 pl-4 pr-12 text-base font-semibold text-[#111111] outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    aria-label="Voice input"
                    className={`absolute right-2 flex h-10 w-10 items-center justify-center rounded-xl transition ${
                      listening ? 'bg-[#FF7A00] text-white animate-pulse' : 'bg-white text-[#111111]'
                    }`}
                  >
                    {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                </div>

                {/* Smart Autocomplete */}
                {nameSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {nameSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setGuestName(s)}
                        className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-700"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Duplicate warning */}
                {recentDuplicate && (
                  <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      <strong>{recentDuplicate.guest_name}</strong> was logged just now — save anyway?
                    </span>
                  </div>
                )}
              </div>

              {/* Optional Fields — None selected by default */}
              <div className="space-y-4 border-t border-neutral-100 pt-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Group / Relation (Optional)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {config.groups.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setSelectedGroup(selectedGroup === g ? '' : g)}
                        className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${
                          selectedGroup === g
                            ? 'bg-[#111111] text-white'
                            : 'bg-[#F6F6F6] text-[#111111]'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Event (Optional)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {config.events.map((ev) => (
                        <button
                          key={ev}
                          type="button"
                          onClick={() => setSelectedEvent(selectedEvent === ev ? '' : ev)}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                            selectedEvent === ev
                              ? 'bg-[#111111] text-white'
                              : 'bg-[#F6F6F6] text-[#111111]'
                          }`}
                        >
                          {ev}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Side (Optional)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {config.sides.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedSide(selectedSide === s ? '' : s)}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                            selectedSide === s
                              ? 'bg-[#111111] text-white'
                              : 'bg-[#F6F6F6] text-[#111111]'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    City (Optional)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {adaptiveCities.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setSelectedCity(selectedCity === c ? '' : c);
                          setCustomCity('');
                        }}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                          selectedCity === c
                            ? 'bg-[#111111] text-white'
                            : 'bg-[#F6F6F6] text-[#111111]'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={customCity}
                    onChange={(e) => {
                      setCustomCity(e.target.value);
                      if (e.target.value) setSelectedCity('');
                    }}
                    placeholder="Or type another city..."
                    className="mt-1.5 w-full rounded-2xl bg-[#F6F6F6] px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                </div>

                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note (e.g. Sent via brother)..."
                  className="w-full rounded-2xl bg-[#F6F6F6] px-3.5 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              {/* Signature Orange CTA Banner */}
              <button
                type="button"
                onClick={handleSaveAndNext}
                className="flex w-full items-center justify-between rounded-[24px] bg-[#FF7A00] px-5 py-4 text-left text-white shadow-lg shadow-[#FF7A00]/25 active:scale-[0.99]"
              >
                <div>
                  <div className="text-base font-extrabold">Save & Next</div>
                  <div className="text-xs font-medium text-white/85">
                    {mode === 'Cash'
                      ? amount > 0
                        ? `Log ${formatCurrency(amount, config.currency)} offline-first`
                        : 'Saves instantly to device & Sheet'
                      : `Assign Envelope #${nextEnvelopeNo} as Pending`}
                  </div>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#111111] text-white">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </button>
            </div>
          )}

          {/* ================= LEDGER TAB ================= */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search guest, envelope #, or city..."
                  className="w-full rounded-2xl bg-[#F6F6F6] py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {['All', 'Pending', ...config.events].map((f) => (
                  <button
                    key={f}
                    onClick={() => setLedgerFilter(f)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                      ledgerFilter === f
                        ? 'bg-[#111111] text-white'
                        : 'bg-[#F6F6F6] text-neutral-600'
                    }`}
                  >
                    {f === 'Pending' ? `Pending Envelopes (${pendingEnvelopes.length})` : f}
                  </button>
                ))}
              </div>

              {filteredLedger.length === 0 ? (
                <div className="rounded-[24px] bg-[#F6F6F6] p-8 text-center">
                  <p className="text-sm font-bold text-neutral-500">No entries yet.</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    Tap the + button below to log your first salami.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredLedger.map((item) => {
                    const isPending = item.status === 'Pending';
                    return (
                      <div
                        key={item.id}
                        onClick={() => isPending && setClearingEntry(item)}
                        className={`rounded-[22px] bg-[#F6F6F6] p-4 transition ${
                          isPending ? 'cursor-pointer ring-2 ring-[#FF7A00]/40 active:scale-[0.99]' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-bold text-[#FF7A00]">
                              {isPending
                                ? `Pending Envelope #${item.envelope_no} — Tap to Clear`
                                : `${item.mode}${item.envelope_no ? ` #${item.envelope_no}` : ''}${
                                    item.event ? ` • ${item.event}` : ''
                                  }`}
                            </span>
                            <h3 className="mt-0.5 text-base font-extrabold text-[#111111]">
                              {item.guest_name}
                            </h3>
                            <p className="mt-0.5 text-xs font-medium text-neutral-400">
                              {[item.group, item.city, item.collected_by].filter(Boolean).join(' • ') ||
                                new Date(item.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                            </p>
                          </div>

                          <div className="text-right">
                            <div className="text-base font-extrabold text-[#111111]">
                              {isPending ? '—' : formatCurrency(item.amount, item.currency)}
                            </div>
                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                item.sync_status === 'synced'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-neutral-200 text-neutral-600'
                              }`}
                            >
                              {item.sync_status === 'synced' ? 'Synced' : 'Local'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= SUMMARY TAB ================= */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {/* Collector Filter */}
              {collectors.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {['All', ...collectors].map((c) => (
                    <button
                      key={c}
                      onClick={() => setSummaryCollector(c)}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                        summaryCollector === c
                          ? 'bg-[#111111] text-white'
                          : 'bg-[#F6F6F6] text-neutral-600'
                      }`}
                    >
                      {c === 'All' ? 'All Collectors' : c}
                    </button>
                  ))}
                </div>
              )}

              {/* Jet-Black Hero Card */}
              <div className="rounded-[28px] bg-[#111111] p-5 text-white">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-xl font-extrabold text-[#FF7A00]">
                      {summaryStats.totalAmount.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-semibold text-neutral-400">
                      Total ({config.currency})
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-extrabold">{summaryStats.guestCount}</div>
                    <div className="text-[11px] font-semibold text-neutral-400">Guests</div>
                  </div>
                  <div>
                    <div className="text-xl font-extrabold">{summaryStats.pendingCount}</div>
                    <div className="text-[11px] font-semibold text-neutral-400">Pending</div>
                  </div>
                </div>

                {/* Envelope Progress Bar */}
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-neutral-400">
                    <span>Envelopes Cleared</span>
                    <span>
                      {summaryStats.clearedEnvelopes}/{summaryStats.totalEnvelopes}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-[#FF7A00] transition-all"
                      style={{
                        width: `${
                          summaryStats.totalEnvelopes === 0
                            ? 100
                            : Math.round(
                                (summaryStats.clearedEnvelopes / summaryStats.totalEnvelopes) * 100
                              )
                        }%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Cash by Note Denomination Card */}
              <div className="rounded-[24px] bg-[#F6F6F6] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-[#111111]">
                      Cash by Note Denomination
                    </h2>
                    <p className="text-xs font-medium text-neutral-500">
                      {summaryCollector === 'All'
                        ? 'Combined cash bundle verification'
                        : `Bundle held by ${summaryCollector}`}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#111111] px-3 py-1 text-xs font-bold text-white">
                    {summaryStats.totalNotes} notes
                  </span>
                </div>

                <div className="space-y-2">
                  {currencyPreset.denominations.map((denom) => {
                    const qty = summaryStats.denomCounts[denom] || 0;
                    const subtotal = denom * qty;
                    const accent = currencyPreset.noteColors?.[denom] || '#111111';
                    return (
                      <div
                        key={denom}
                        className="flex items-center justify-between rounded-2xl bg-white px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: accent }}
                          />
                          <span className="text-sm font-extrabold text-[#111111]">
                            {currencyPreset.symbol} {denom.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-neutral-400">× {qty}</span>
                          <span className="w-24 text-right text-sm font-extrabold text-[#111111]">
                            {subtotal.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3 text-sm font-extrabold">
                  <span>Total Cash Verified</span>
                  <span className="text-[#FF7A00]">
                    {formatCurrency(summaryStats.totalAmount, config.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================= GOOGLE SHEET & SYNC TAB ================= */}
          {activeTab === 'sheet' && (
            <div className="space-y-4">
              {/* Connection Card */}
              <div className="rounded-[24px] bg-[#111111] p-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isOnline ? (
                      <Cloud className="h-5 w-5 text-[#FF7A00]" />
                    ) : (
                      <CloudOff className="h-5 w-5 text-amber-400" />
                    )}
                    <span className="text-sm font-extrabold">
                      {googleUser ? googleUser.name : 'Local Offline Mode'}
                    </span>
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold">
                    {pendingQueue} queued
                  </span>
                </div>

                <p className="mt-2 text-xs text-neutral-400">
                  {!isGoogleConfigured()
                    ? 'Google Cloud Client ID is not set in .env yet. All entries are safely saved in IndexedDB and ready for CSV export.'
                    : sheetMeta.spreadsheetId
                    ? `Linked to "${sheetMeta.spreadsheetName}" via drive.file scope.`
                    : 'Sign in with Gmail to create or join a shared wedding Google Sheet.'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {!googleUser ? (
                    <button
                      onClick={handleGoogleSignIn}
                      className="rounded-full bg-[#FF7A00] px-4 py-2.5 text-xs font-extrabold text-white"
                    >
                      Sign in with Google
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleCreateSheet}
                        disabled={syncingNow}
                        className="rounded-full bg-[#FF7A00] px-4 py-2.5 text-xs font-extrabold text-white"
                      >
                        Create New Sheet
                      </button>
                      <button
                        onClick={handleJoinSharedSheet}
                        disabled={syncingNow}
                        className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2.5 text-xs font-bold text-white"
                      >
                        <FolderOpen className="h-3.5 w-3.5" /> Join Shared Sheet
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleManualSync}
                  disabled={syncingNow}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#F6F6F6] py-3.5 text-xs font-extrabold text-[#111111]"
                >
                  <RefreshCw className={`h-4 w-4 ${syncingNow ? 'animate-spin' : ''}`} />
                  Sync Now
                </button>
                <button
                  onClick={() => exportEntriesToCSV(entries, config.wedding_title)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#F6F6F6] py-3.5 text-xs font-extrabold text-[#111111]"
                >
                  <Download className="h-4 w-4" />
                  Export .CSV
                </button>
              </div>

              {sheetMeta.spreadsheetUrl && (
                <a
                  href={sheetMeta.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-2xl bg-[#F6F6F6] px-4 py-3.5 text-xs font-extrabold text-[#111111]"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Open in Google Sheets
                  </span>
                  <ExternalLink className="h-4 w-4 text-neutral-400" />
                </a>
              )}

              {/* Live 2-Tab Schema Preview */}
              <div className="rounded-[24px] bg-[#F6F6F6] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">
                    Sheet Schema Preview
                  </span>
                  <div className="flex gap-1 rounded-full bg-white p-1">
                    {['Ledger', '_Config'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setSheetPreviewTab(t)}
                        className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                          sheetPreviewTab === t ? 'bg-[#111111] text-white' : 'text-neutral-500'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {sheetPreviewTab === 'Ledger' ? (
                  <div className="overflow-x-auto rounded-xl bg-white p-2">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-neutral-100 text-neutral-400">
                          {LEDGER_HEADERS.slice(0, 7).map((h) => (
                            <th key={h} className="px-2 py-1.5 font-bold">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {entries.slice(0, 5).map((e) => (
                          <tr key={e.id} className="border-b border-neutral-50 font-medium">
                            <td className="px-2 py-1.5 text-neutral-400">{e.id.slice(0, 8)}</td>
                            <td className="px-2 py-1.5">
                              {new Date(e.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="px-2 py-1.5 font-bold">{e.guest_name}</td>
                            <td className="px-2 py-1.5">{e.amount ?? '—'}</td>
                            <td className="px-2 py-1.5">{e.currency}</td>
                            <td className="px-2 py-1.5">{e.mode}</td>
                            <td className="px-2 py-1.5">{e.envelope_no || '—'}</td>
                          </tr>
                        ))}
                        {entries.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-2 py-4 text-center text-neutral-400">
                              No rows yet — add an entry to preview.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-1.5 rounded-xl bg-white p-3 text-xs">
                    {Object.entries(config).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3 border-b border-neutral-50 pb-1">
                        <span className="font-bold text-neutral-500">{k}</span>
                        <span className="truncate font-semibold text-[#111111]">
                          {Array.isArray(v) ? v.join(', ') : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-center">
                <a
                  href="./privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-neutral-400 underline"
                >
                  Zero-Server Privacy Policy
                </a>
              </div>
            </div>
          )}
        </main>

        {/* Docked 4-Tab Bottom Nav with Central Quick-Add Button */}
        <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[430px] -translate-x-1/2 items-center justify-around border-t border-neutral-100 bg-white/95 px-3 py-3 backdrop-blur-md sm:absolute">
          <button
            onClick={() => setActiveTab('collect')}
            className={`flex flex-col items-center gap-0.5 text-[11px] font-bold ${
              activeTab === 'collect' ? 'text-[#FF7A00]' : 'text-neutral-400'
            }`}
          >
            <Home className="h-5 w-5" />
            Collect
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`relative flex flex-col items-center gap-0.5 text-[11px] font-bold ${
              activeTab === 'ledger' ? 'text-[#FF7A00]' : 'text-neutral-400'
            }`}
          >
            <ListChecks className="h-5 w-5" />
            Ledger
            {pendingEnvelopes.length > 0 && (
              <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#FF7A00] px-1 text-[9px] font-extrabold text-white">
                {pendingEnvelopes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('collect');
              setTimeout(() => nameInputRef.current?.focus(), 100);
            }}
            aria-label="Quick Add"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#111111] text-white shadow-xl active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`flex flex-col items-center gap-0.5 text-[11px] font-bold ${
              activeTab === 'summary' ? 'text-[#FF7A00]' : 'text-neutral-400'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            Summary
          </button>

          <button
            onClick={() => setActiveTab('sheet')}
            className={`flex flex-col items-center gap-0.5 text-[11px] font-bold ${
              activeTab === 'sheet' ? 'text-[#FF7A00]' : 'text-neutral-400'
            }`}
          >
            <FileSpreadsheet className="h-5 w-5" />
            Sheet
          </button>
        </nav>

        {/* Modals */}
        <SettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          config={config}
          onSaveConfig={handleSaveConfig}
        />

        <EnvelopeClearSheet
          entry={clearingEntry}
          remainingCount={pendingEnvelopes.length}
          currency={clearingEntry?.currency || config.currency}
          onClose={() => setClearingEntry(null)}
          onSaveAndNext={handleClearEnvelope}
        />
      </div>
    </div>
  );
}
