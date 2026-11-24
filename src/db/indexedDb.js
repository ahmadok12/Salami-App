import Dexie from 'dexie';
import { DEFAULT_CONFIG } from '../config/defaults.js';

export const db = new Dexie('SalamiBookDB');

db.version(1).stores({
  entries: 'id, timestamp, guest_name, mode, status, collected_by, event, sync_status',
  config: 'key',
  syncQueue: '++queueId, entryId, action, createdAt'
});

/**
 * Request persistent browser storage so Android/iOS doesn't evict IndexedDB under storage pressure.
 */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const persisted = await navigator.storage.persist();
      return persisted;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Estimate remaining browser storage for offline confidence display.
 */
export async function getStorageEstimate() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      return { usage, quota };
    }
  } catch {
    // ignore
  }
  return { usage: 0, quota: 0 };
}

export async function loadLocalConfig() {
  const row = await db.config.get('wedding_config');
  if (row && row.value) {
    return {
      ...DEFAULT_CONFIG,
      ...row.value,
      visible_fields: {
        ...DEFAULT_CONFIG.visible_fields,
        ...(row.value.visible_fields || {})
      }
    };
  }
  await db.config.put({ key: 'wedding_config', value: DEFAULT_CONFIG });
  return { ...DEFAULT_CONFIG };
}

export async function saveLocalConfig(newConfig, enqueueSync = true) {
  const merged = {
    ...DEFAULT_CONFIG,
    ...newConfig,
    visible_fields: {
      ...DEFAULT_CONFIG.visible_fields,
      ...(newConfig.visible_fields || {})
    },
    updated_at: new Date().toISOString()
  };
  await db.config.put({ key: 'wedding_config', value: merged });
  if (enqueueSync) {
    // Deduplicate pending config syncs
    await db.syncQueue.where('action').equals('SYNC_CONFIG').delete();
    await db.syncQueue.add({
      entryId: 'wedding_config',
      action: 'SYNC_CONFIG',
      payload: merged,
      createdAt: new Date().toISOString(),
      retryCount: 0
    });
  }
  return merged;
}

export async function loadSheetMeta() {
  const row = await db.config.get('sheet_meta');
  return row?.value || { spreadsheetId: null, spreadsheetUrl: null, spreadsheetName: null };
}

export async function saveSheetMeta(meta) {
  await db.config.put({ key: 'sheet_meta', value: meta });
  return meta;
}

export async function getAllEntries() {
  return db.entries.orderBy('timestamp').reverse().toArray();
}

export async function addEntryOfflineFirst(entry) {
  const record = {
    ...entry,
    sync_status: 'pending'
  };
  await db.entries.put(record);
  await db.syncQueue.add({
    entryId: record.id,
    action: 'APPEND',
    payload: record,
    createdAt: new Date().toISOString(),
    retryCount: 0
  });
  return record;
}

export async function updateEntryOfflineFirst(entry) {
  const record = {
    ...entry,
    sync_status: 'pending'
  };
  await db.entries.put(record);
  await db.syncQueue.add({
    entryId: record.id,
    action: 'UPDATE',
    payload: record,
    createdAt: new Date().toISOString(),
    retryCount: 0
  });
  return record;
}

export async function deleteEntryOfflineFirst(entryId) {
  await db.entries.delete(entryId);
  // If it was never synced (still in APPEND queue), just remove from queue
  const pendingAppends = await db.syncQueue
    .where('entryId')
    .equals(entryId)
    .and((item) => item.action === 'APPEND')
    .toArray();
  if (pendingAppends.length > 0) {
    await db.syncQueue.where('entryId').equals(entryId).delete();
  }
}

export async function getPendingQueueCount() {
  return db.syncQueue.count();
}

export async function upsertSyncedEntries(remoteEntries) {
  if (!Array.isArray(remoteEntries) || remoteEntries.length === 0) return;
  const cleaned = remoteEntries.map((e) => ({ ...e, sync_status: 'synced' }));
  await db.entries.bulkPut(cleaned);
}


export async function isOnboardingCompleted() {
  const row = await db.config.get('onboarding_completed');
  if (row && row.value === true) return true;
  // Returning users who already logged entries before this update skip onboarding automatically
  const existingCount = await db.entries.count();
  if (existingCount > 0) {
    await db.config.put({ key: 'onboarding_completed', value: true });
    return true;
  }
  return false;
}

export async function setOnboardingCompleted(done = true) {
  await db.config.put({ key: 'onboarding_completed', value: Boolean(done) });
}
