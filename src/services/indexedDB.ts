import { Grievance, NotificationItem } from '../types';

const DB_NAME = 'CampusFixLocalDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Grievances store
      if (!db.objectStoreNames.contains('grievances')) {
        const grievanceStore = db.createObjectStore('grievances', { keyPath: 'id' });
        grievanceStore.createIndex('public_id', 'public_id', { unique: true });
        grievanceStore.createIndex('student_id', 'student_id', { unique: false });
        grievanceStore.createIndex('status', 'status', { unique: false });
      }

      // 2. Notifications store
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { keyPath: 'id' });
      }

      // 3. Metadata store (e.g. sync timestamps)
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Cache grievances list locally in IndexedDB
 */
export async function cacheGrievances(grievances: Grievance[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(['grievances', 'metadata'], 'readwrite');
    const store = tx.objectStore('grievances');

    // Upsert each grievance
    for (const g of grievances) {
      store.put(g);
    }

    // Update last sync timestamp
    const metaStore = tx.objectStore('metadata');
    metaStore.put({ key: 'last_sync_grievances', timestamp: new Date().toISOString() });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to cache grievances:', err);
  }
}

/**
 * Retrieve all cached grievances from IndexedDB
 */
export async function getCachedGrievances(): Promise<Grievance[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('grievances', 'readonly');
    const store = tx.objectStore('grievances');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const results = (request.result || []) as Grievance[];
        // Sort newest first by id or created_at
        results.sort((a, b) => b.id - a.id);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to get cached grievances:', err);
    return [];
  }
}

/**
 * Retrieve a single grievance by its public_id from IndexedDB
 */
export async function getCachedGrievanceByPublicId(publicId: string): Promise<Grievance | null> {
  try {
    const db = await getDB();
    const tx = db.transaction('grievances', 'readonly');
    const store = tx.objectStore('grievances');
    const index = store.index('public_id');
    const request = index.get(publicId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve((request.result as Grievance) || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to get cached grievance by public_id:', err);
    return null;
  }
}

/**
 * Cache notifications list locally in IndexedDB
 */
export async function cacheNotifications(notifications: NotificationItem[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(['notifications', 'metadata'], 'readwrite');
    const store = tx.objectStore('notifications');

    for (const n of notifications) {
      store.put(n);
    }

    const metaStore = tx.objectStore('metadata');
    metaStore.put({ key: 'last_sync_notifications', timestamp: new Date().toISOString() });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to cache notifications:', err);
  }
}

/**
 * Retrieve all cached notifications from IndexedDB
 */
export async function getCachedNotifications(): Promise<NotificationItem[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('notifications', 'readonly');
    const store = tx.objectStore('notifications');
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const results = (request.result || []) as NotificationItem[];
        results.sort((a, b) => b.id - a.id);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to get cached notifications:', err);
    return [];
  }
}

/**
 * Get last sync timestamp for a given key
 */
export async function getLastSyncTimestamp(key: 'grievances' | 'notifications'): Promise<string | null> {
  try {
    const db = await getDB();
    const tx = db.transaction('metadata', 'readonly');
    const store = tx.objectStore('metadata');
    const request = store.get(`last_sync_${key}`);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result?.timestamp || null);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Clear all cached items (e.g. on logout)
 */
export async function clearAllLocalCache(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(['grievances', 'notifications', 'metadata'], 'readwrite');
    tx.objectStore('grievances').clear();
    tx.objectStore('notifications').clear();
    tx.objectStore('metadata').clear();
  } catch (err) {
    console.warn('[IndexedDB] Failed to clear local cache:', err);
  }
}
