import { openDB, IDBPDatabase } from 'idb';
import { CloudFile, StorageMetricsData } from '../types';

const DB_NAME = 'teledrive_cache_v2';
const THUMB_STORE = 'thumbnails';
const FILES_STORE = 'files';
const META_STORE = 'meta';
const DB_VERSION = 1;

export const DEFAULT_STATS: StorageMetricsData = {
  totalBytes: 0,
  photoBytes: 0,
  videoBytes: 0,
  docBytes: 0,
  audioBytes: 0,
  otherBytes: 0,
  totalCount: 0,
  photoCount: 0,
  videoCount: 0,
  docCount: 0,
  audioCount: 0,
  otherCount: 0,
  lastUpdated: 0,
  isScanning: false,
  scannedAllHistory: false,
};

class CacheService {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDB();
    }
  }

  private initDB(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(THUMB_STORE)) {
            db.createObjectStore(THUMB_STORE);
          }
          if (!db.objectStoreNames.contains(FILES_STORE)) {
            db.createObjectStore(FILES_STORE, { keyPath: 'messageId' });
          }
          if (!db.objectStoreNames.contains(META_STORE)) {
            db.createObjectStore(META_STORE);
          }
        },
      });
    }
    return this.dbPromise;
  }

  // Synchronous access to localStorage for 0ms initial UI load
  getInitialStatsSync(): StorageMetricsData {
    if (typeof window === 'undefined') return DEFAULT_STATS;
    try {
      const raw = localStorage.getItem('td_storage_stats_v2');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse cached stats from localStorage', e);
    }
    return DEFAULT_STATS;
  }

  async getThumbnail(key: string): Promise<string | null> {
    try {
      const db = await this.initDB();
      const blob = await db.get(THUMB_STORE, key);
      if (blob) {
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.error('Cache Read Error:', e);
    }
    return null;
  }

  async setThumbnail(key: string, buffer: Uint8Array | ArrayBuffer, mimeType: string = 'image/jpeg'): Promise<void> {
    try {
      const db = await this.initDB();
      const blob = new Blob([buffer], { type: mimeType });
      await db.put(THUMB_STORE, blob, key);
    } catch (e) {
      console.error('Cache Write Error:', e);
    }
  }

  async getCachedFiles(): Promise<CloudFile[]> {
    try {
      const db = await this.initDB();
      const all = await db.getAll(FILES_STORE);
      return (all || []).sort((a: CloudFile, b: CloudFile) => b.date - a.date);
    } catch (e) {
      console.error('Failed to get cached files:', e);
      return [];
    }
  }

  async saveCachedFiles(files: CloudFile[]): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(FILES_STORE, 'readwrite');
      for (const file of files) {
        await tx.store.put(file);
      }
      await tx.done;
    } catch (e) {
      console.error('Failed to save cached files:', e);
    }
  }

  async upsertCachedFile(file: CloudFile): Promise<void> {
    try {
      const db = await this.initDB();
      await db.put(FILES_STORE, file);
    } catch (e) {
      console.error('Failed to upsert cached file:', e);
    }
  }

  async removeCachedFile(messageId: number): Promise<void> {
    try {
      const db = await this.initDB();
      await db.delete(FILES_STORE, messageId);
    } catch (e) {
      console.error('Failed to remove cached file:', e);
    }
  }

  async getCachedStats(): Promise<StorageMetricsData | null> {
    try {
      const db = await this.initDB();
      const stats = await db.get(META_STORE, 'stats');
      if (stats) return stats;
    } catch (e) {
      console.error('Failed to get cached stats from IDB:', e);
    }
    return this.getInitialStatsSync();
  }

  async saveCachedStats(stats: StorageMetricsData): Promise<void> {
    try {
      // 1. Save to localStorage for instant synchronous read
      localStorage.setItem('td_storage_stats_v2', JSON.stringify(stats));
      // 2. Save to IDB
      const db = await this.initDB();
      await db.put(META_STORE, stats, 'stats');
    } catch (e) {
      console.error('Failed to save cached stats:', e);
    }
  }

  async clearCache(): Promise<void> {
    try {
      const db = await this.initDB();
      await db.clear(THUMB_STORE);
      await db.clear(FILES_STORE);
      await db.clear(META_STORE);
      localStorage.removeItem('td_storage_stats_v2');
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
  }
}

export const cacheService = new CacheService();
